export function onClickOutside(el, handler) {
  const listener = (event) => {
    if (!el.contains(event.target)) {
      handler(event);
    }
  };

  document.addEventListener("mousedown", listener);

  return () => {
    document.removeEventListener("mousedown", listener);
  };
}
