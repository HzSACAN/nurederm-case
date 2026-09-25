import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { load } from 'cheerio';
import { convert } from 'html-to-text';

export const workflow = JSON.parse(readFileSync(new URL('../workflow.json', import.meta.url), 'utf8'));
export const fixture = readFileSync(new URL('./fixtures/laptops.html', import.meta.url), 'utf8');
export const byName = name => {
  const node = workflow.nodes.find(candidate => candidate.name === name);
  if (!node) throw new Error('Unknown workflow node: ' + name);
  return node;
};
export const items = rows => rows.map(json => ({ json }));

// Executes the delivered jsCode itself. This is a bounded, offline Code context,
// not the n8n engine. No DOM, fetch, require, filesystem or npm globals are exposed.
export function code(name, input, references = {}) {
  const node = byName(name);
  const context = {
    $input: { first: () => input[0], all: () => input },
    $execution: { id: 'offline-fixture' },
    $: source => {
      const values = references[source];
      if (!values) throw new Error('Missing reference: ' + source);
      return { first: () => values[0], all: () => values, itemMatching: index => values[index] };
    },
  };
  return structuredClone(runInNewContext(`(function(){\n${node.parameters.jsCode}\n})()`, context, { timeout: 1000 }));
}

// workflow.json selectors with the same Cheerio/html-to-text versions and
// extraction semantics inspected in n8n 1.112.6 Html.node.ts / Html/utils.ts.
export function html(name, input) {
  const { dataPropertyName, extractionValues, options } = byName(name).parameters;
  return input.map((item, index) => {
    const $ = load(item.json[dataPropertyName]);
    const json = {};
    for (const setting of extractionValues.values) {
      const values = $(setting.cssSelector).toArray().map(element => {
        let value = setting.returnValue === 'attribute' ? $(element).attr(setting.attribute)
          : setting.returnValue === 'html' ? $(element).html() || undefined : convert($(element).html() || '');
        if (value === undefined || value === null) return value;
        if (options.trimValues) value = value.trim();
        if (options.cleanUpText) value = value.replace(/^\s+|\s+$/g, '').replace(/(\r\n|\n|\r)/gm, '').replace(/\s+/g, ' ');
        return value;
      });
      json[setting.key] = setting.returnArray ? values : values[0];
    }
    return { json, pairedItem: { item: index } };
  });
}

export function initial() {
  const config = code('Configuration', items([{}]))[0].json;
  return code('Initialize Run', items([{ ...config, spreadsheet_id: 'offline_sheet', telegram_chat_id: '-12345' }]))[0].json;
}
export function page(state, pageHtml, statusCode = 200) {
  const source = code('Page State', items([state]));
  const checked = code('Check HTTP', items([{ body: pageHtml, statusCode }]), { 'Page State': source });
  const extracted = html('Extract Page HTML', checked);
  const cards = code('Expand Cards', extracted, { 'Check HTTP': checked });
  const cardFields = html('Extract Card HTML', cards);
  return code('Validate Page', cardFields, { 'Expand Cards': cards })[0].json;
}
export function singlePageFixture() {
  const $ = load(fixture);
  $('.pagination').remove();
  return $.html();
}
export function completedScan() {
  return code('Finalize Scan', items([page(initial(), singlePageFixture())]))[0].json;
}
export function previous(scan, runs) {
  return code('Select Previous Run', items(runs.length ? runs : [{}]), { 'Finalize Scan': items([scan]) })[0].json;
}
export function compare(state, snapshots) {
  return code('Compare Snapshots', items(snapshots.length ? snapshots : [{}]), { 'Select Previous Run': items([state]) })[0].json;
}
export function next(name, output = 0) {
  return workflow.connections[name]?.main[output]?.map(edge => edge.node) ?? [];
}

// Offline graph exercise only. Native connectors are deliberately stubbed.
// Their output replacement/error shapes are modeled, not actually executed.
export function runGraph({ pages, runs = [], snapshots = [], failAt, failErrorNotification = false }) {
  const references = {};
  const effects = { trace: [], snapshotRows: [], completedRuns: [], alerts: [], errors: [], failed: false };
  const queue = [{ name: 'Configuration', input: items([{}]) }];
  const expression = (value, json) => runInNewContext(value.slice(3, -2), {
    $json: json, $: name => ({ first: () => references[name][0] }),
  }, { timeout: 1000 });
  while (queue.length) {
    if (effects.trace.length > 500) throw new Error('Offline graph did not terminate');
    const { name, input } = queue.shift();
    effects.trace.push(name);
    const node = byName(name);
    let output, port = 0;
    try {
      if (name === failAt) throw new Error('Simulated connector failure: ' + name);
      if (node.type.endsWith('.code')) {
        output = code(name, input, references);
        if (name === 'Configuration') Object.assign(output[0].json, { spreadsheet_id: 'offline_sheet', telegram_chat_id: '-12345' });
      } else if (node.type.endsWith('.httpRequest')) {
        const number = input[0].json.page;
        if (!pages[number]) throw new Error('Simulated HTTP timeout on page ' + number);
        output = items([{ body: pages[number], statusCode: 200 }]);
      } else if (node.type.endsWith('.html')) output = html(name, input);
      else if (node.type.endsWith('.wait')) output = input;
      else if (node.type.endsWith('.if')) {
        const condition = node.parameters.conditions.conditions[0];
        port = expression(condition.leftValue, input[0].json) === true ? 0 : 1;
        output = input;
      } else if (node.type.endsWith('.googleSheets')) {
        if (node.parameters.operation === 'read') {
          const rows = node.parameters.sheetName.value === 'runs' ? runs : snapshots;
          output = items(rows.length ? rows : [{}]);
        } else {
          const target = node.parameters.sheetName.value === 'runs' ? effects.completedRuns : effects.snapshotRows;
          target.push(...input.map(item => structuredClone(item.json)));
          output = structuredClone(input);
        }
      } else if (node.type.endsWith('.telegram')) {
        if (name === 'Send Error' && failErrorNotification) throw new Error('Simulated error notification failure');
        (name === 'Send Error' ? effects.errors : effects.alerts).push(expression(node.parameters.text, input[0].json));
        output = items([{ ok: true, result: { message_id: 99 } }]);
      } else if (node.type.endsWith('.stopAndError')) {
        effects.failed = true;
        break;
      } else throw new Error('Unsupported offline connector');
    } catch (error) {
      if (node.onError === 'continueErrorOutput') port = 1;
      else if (node.onError !== 'continueRegularOutput') throw error;
      output = items([{ ...input[0]?.json, error: error.message }]);
    }
    references[name] = output;
    for (const destination of next(name, port)) queue.push({ name: destination, input: output });
  }
  return effects;
}
