import { Field, FieldLabel } from '@ui-sdk/react/field';
import { SegmentedControl, SegmentedControlIndicator, SegmentedControlItem } from '@ui-sdk/react/segmented-control';
import { Slider, SliderControl, SliderIndicator, SliderThumb, SliderTrack } from '@ui-sdk/react/slider';
import { Switch, SwitchThumb } from '@ui-sdk/react/switch';

/** A labelled slider over integer steps; `valueText` shows what the current step means. */
export function SliderField(props: { label: string; value: number; min: number; max: number; valueText: string; onChange: (v: number) => void }) {
  return (
    <Field>
      <div className="board-field-head">
        <FieldLabel>{props.label}</FieldLabel>
        <output className="board-value">{props.valueText}</output>
      </div>
      <Slider
        value={props.value}
        min={props.min}
        max={props.max}
        step={1}
        onValueChange={(v) => props.onChange(typeof v === 'number' ? v : v[0])}
      >
        <SliderControl>
          <SliderTrack>
            <SliderIndicator />
            <SliderThumb />
          </SliderTrack>
        </SliderControl>
      </Slider>
    </Field>
  );
}

export function SegmentedField<T extends string>(props: { label: string; value: T; options: ReadonlyArray<{ value: T; label: string }>; onChange: (v: T) => void }) {
  return (
    <Field>
      <FieldLabel>{props.label}</FieldLabel>
      <SegmentedControl value={props.value} onValueChange={(v) => v != null && props.onChange(v as T)}>
        <SegmentedControlIndicator />
        {props.options.map((o) => (
          <SegmentedControlItem key={o.value} value={o.value}>
            {o.label}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
    </Field>
  );
}

export function SwitchField(props: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="board-switch">
      {props.label}
      <Switch checked={props.checked} onCheckedChange={(c) => props.onChange(c)}>
        <SwitchThumb />
      </Switch>
    </label>
  );
}
