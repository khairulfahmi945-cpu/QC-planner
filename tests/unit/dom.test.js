import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cx, escapeHtml, html, joinHtml, raw } from '../../src/js/lib/dom.js';

test('escapeHtml escapes markup characters', () => {
  assert.equal(escapeHtml('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
  assert.equal(escapeHtml(null), '');
});

test('html escapes values but keeps nested templates and arrays', () => {
  const name = '<script>alert(1)</script>';
  const out = html`<p>${name}</p>${[html`<i>1</i>`, html`<i>2</i>`]}`;
  assert.ok(!out.markup.includes('<script>'));
  assert.ok(out.markup.includes('<i>1</i><i>2</i>'));
});

test('raw markup is trusted and joinHtml joins with a separator', () => {
  assert.equal(html`${raw('<b>x</b>')}`.markup, '<b>x</b>');
  assert.equal(joinHtml([html`<a></a>`, html`<b></b>`], '|').markup, '<a></a>|<b></b>');
});

test('cx drops falsy class names', () => {
  assert.equal(cx('card', false, null, 'bad'), 'card bad');
});
