import { useState } from "react";
import { createRoot } from "react-dom/client";
import * as Select from "@radix-ui/react-select";

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
    </>
  );
}

const root = document.getElementById("react-root");
if (root) createRoot(root).render(<Fixture />);
