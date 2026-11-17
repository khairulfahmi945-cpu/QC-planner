import { describeDays, formatDate } from '../../../lib/dates.js';
import { html } from '../../../lib/dom.js';
import { detailList, detailRow, emptyNote } from '../../../ui/components.js';
import { couplingCard } from '../parts.js';

const dateOrDash = (iso) => formatDate(iso) || '–';

export function renderInspection(crane) {
  if (!crane.fyk.length) return emptyNote('No inspection record for this crane.');
  return html`
    <article class="card">
      <h3>PMA / CF</h3>
      ${detailList(
        detailRow('PMA no.', crane.pma),
        detailRow('Serial no.', crane.serial),
        detailRow('Expiry', formatDate(crane.pmaExp)),
        detailRow('Status', crane.pmaExp ? describeDays(crane.pmaExp) : ''),
      )}
    </article>
    <article class="card">
      <h3>Quarterly inspection</h3>
      <table class="qt">
        <thead><tr><th>Quarter</th><th>Actual</th><th>Next plan</th></tr></thead>
        <tbody>${crane.fyk.map((quarter) => html`
          <tr><td>${quarter.q}</td><td>${dateOrDash(quarter.a)}</td><td>${dateOrDash(quarter.n)}</td></tr>`)}
        </tbody>
      </table>
    </article>
    ${crane.sos ? couplingCard(crane.sos) : ''}`;
}
