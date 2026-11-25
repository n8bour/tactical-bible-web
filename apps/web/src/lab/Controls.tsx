import { ROLE_BY_ID } from '@tb/content';
import { Field, FieldLabel } from '@ui-sdk/react/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui-sdk/react/select';
import { Slider, SliderControl, SliderIndicator, SliderThumb, SliderTrack } from '@ui-sdk/react/slider';
import { Switch, SwitchThumb } from '@ui-sdk/react/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@ui-sdk/react/tooltip';
import { rulesUsing, type AttrKey } from '@tb/sim';

export interface Option {
  value: string;
  label: string;
}

export function SelectField(props: { label: string; value: string; options: Option[]; onChange: (v: string) => void; name?: string }) {
  return (
    <Field>
      <FieldLabel>{props.label}</FieldLabel>
      <Select value={props.value} onValueChange={(v) => v != null && props.onChange(String(v))} name={props.name}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {props.options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function SwitchRow(props: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="switch-row">
      {props.label}
      <Switch checked={props.checked} onCheckedChange={(c) => props.onChange(c)}>
        <SwitchThumb />
      </Switch>
    </label>
  );
}

function attrHint(key: AttrKey): string {
  const rules = rulesUsing(key);
  if (!rules.length) return 'Not used by the simulation yet; shown for completeness.';
  return 'Simulation: ' + rules.map(([k, r]) => `${k} = ${r.formula}`).join('; ');
}

export function AttrSlider(props: { attr: AttrKey; name: string; value: number; isKey: boolean; changed?: boolean; onChange: (v: number) => void }) {
  return (
    <div className="slider-row" data-changed={props.changed ? '' : undefined}>
      <Tooltip>
        <TooltipTrigger render={<span tabIndex={0} />}>{props.isKey ? <strong>{props.name}</strong> : props.name}</TooltipTrigger>
        <TooltipContent>{attrHint(props.attr)}</TooltipContent>
      </Tooltip>
      <Slider value={props.value} min={1} max={20} step={1} onValueChange={(v) => props.onChange(v as number)}>
        <SliderControl>
          <SliderTrack>
            <SliderIndicator />
            <SliderThumb aria-label={props.name} />
          </SliderTrack>
        </SliderControl>
      </Slider>
      <output>{props.value}</output>
    </div>
  );
}

export const roleLabel = (id: string) => {
  const r = ROLE_BY_ID[id];
  return r ? `${r.name} (${r.ab})` : id;
};
