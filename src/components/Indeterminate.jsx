import { onCleanup, onMount } from "solid-js";

export default function IndeterminateCheckbox(props) {
  let ref;

  onMount(() => {
    if (ref) {
      ref.indeterminate = props.indeterminate;
    }
  });

  onCleanup(() => {
    if (ref) ref.indeterminate = false;
  });

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={props.checked}
      onChange={props.onChange}
    />
  );
}
