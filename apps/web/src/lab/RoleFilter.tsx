import { Field, FieldLabel } from '@ui-sdk/react/field';
import { Input } from '@ui-sdk/react/input';
import { useEffect, useState } from 'react';
import { SelectField, type Option } from './Controls';

/** Filters the pre-rendered role list in place; the list itself stays static HTML. */
export default function RoleFilter({ groups }: { groups: Option[] }) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');
  const [phase, setPhase] = useState('all');

  useEffect(() => {
    const q = query.trim().toLowerCase();
    let shown = 0;
    document.querySelectorAll<HTMLElement>('[data-role-item]').forEach((el) => {
      const ok = (!q || (el.dataset.name ?? '').includes(q))
        && (group === 'all' || (el.dataset.groups ?? '').split(' ').includes(group))
        && (phase === 'all' || el.dataset.phase === phase);
      el.hidden = !ok;
      if (ok) shown++;
    });
    const empty = document.getElementById('role-empty');
    if (empty) empty.hidden = shown > 0;
  }, [query, group, phase]);

  return (
    <div className="filters">
      <Field>
        <FieldLabel>Search</FieldLabel>
        <Input type="search" value={query} onValueChange={(v) => setQuery(String(v))} placeholder="Name or abbreviation" />
      </Field>
      <SelectField label="Position" value={group} options={[{ value: 'all', label: 'All positions' }, ...groups]} onChange={setGroup} />
      <SelectField label="Phase" value={phase} options={[{ value: 'all', label: 'Both' }, { value: 'IP', label: 'In possession' }, { value: 'OOP', label: 'Out of possession' }]} onChange={setPhase} />
    </div>
  );
}
