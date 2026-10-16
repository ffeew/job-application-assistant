import { useEffect, useId, useState } from "react";
import { createRoot } from "react-dom/client";
import * as Select from "@radix-ui/react-select";

// Behaves like a search combobox: the list shows stale options until a
// debounced filter runs, and blur puts the committed choice back in the input.
// A click on `ignored` commits nothing, as a widget that missed it would.
function SearchCombobox({
  label,
  options,
  ignored,
}: {
  label: string;
  options: string[];
  ignored?: string;
}) {
  const listId = useId();
  const [text, setText] = useState("");
  const [query, setQuery] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!text) return;
    const timer = setTimeout(() => setQuery(text), 300);
    return () => clearTimeout(timer);
  }, [text]);
  const choose = (option: string) => {
    if (option === ignored) return;
    setValue(option);
    setText(option);
    setOpen(false);
  };
  const listed =
    query === null
      ? options.slice(0, 1)
      : options.filter((option) =>
          option.toLowerCase().startsWith(query.toLowerCase()),
        );

  return (
    <>
      <input
        role="combobox"
        aria-label={label}
        aria-controls={listId}
        aria-expanded={open}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setOpen(true);
        }}
        onBlur={() => {
          setText(value);
          setQuery(null);
          setOpen(false);
        }}
      />
      {open && (
        <ul id={listId} role="listbox">
          {listed.map((option) => (
            <li
              key={option}
              role="option"
              aria-selected={option === value}
              onClick={() => choose(option)}
              onKeyDown={(event) => {
                if (event.key === "Enter") choose(option);
              }}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// Controlled widgets keep their own state, so filling them proves the page
// script reaches React's handlers rather than only changing the DOM.
function Fixture() {
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  return (
    <>
      <label htmlFor="preferred">Preferred name</label>
      <input
        id="preferred"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <output id="preferred-state">{name}</output>
      <span id="start-label">Start date</span>
      <Select.Root value={start} onValueChange={setStart}>
        <Select.Trigger id="start" aria-labelledby="start-label">
          <Select.Value placeholder="Choose" />
        </Select.Trigger>
        <Select.Portal>
          <Select.Content position="popper">
            <Select.Viewport>
              <Select.Item value="now">
                <Select.ItemText>Immediately</Select.ItemText>
              </Select.Item>
              <Select.Item value="later">
                <Select.ItemText>In two weeks</Select.ItemText>
              </Select.Item>
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      <output id="start-state">{start}</output>
      <SearchCombobox label="Office" options={["Berlin", "Lisbon"]} />
      <SearchCombobox
        label="Team"
        options={["Design", "Platform"]}
        ignored="Platform"
      />
      <SearchCombobox label="Region" options={["Europe", "Asia"]} />
    </>
  );
}

const root = document.getElementById("react-root");
if (root) createRoot(root).render(<Fixture />);
