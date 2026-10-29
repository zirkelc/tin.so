import { AUTO_ICON, resolveIcon, type SpecInput } from "@tin.so/core";
import { useEffect, useState } from "react";
import { Dropdown } from "./menu.tsx";
import { IconSvg } from "./select.tsx";

type Showcase = { name: string; language: string; spec: SpecInput };

/** A menu that opens one of the larger examples. The examples load when the menu opens. */
export function ExamplesMenu(props: { onPick: (spec: SpecInput) => void }) {
  return (
    <Dropdown label="Examples" className="tool examples-trigger" trigger="Examples">
      {(close) => (
        <ExampleList
          onPick={(spec) => {
            close();
            props.onPick(spec);
          }}
        />
      )}
    </Dropdown>
  );
}

function ExampleList(props: { onPick: (spec: SpecInput) => void }) {
  const [examples, setExamples] = useState<Array<Showcase>>();

  useEffect(() => {
    void import("./examples.ts").then((module) => setExamples(module.SHOWCASE_EXAMPLES));
  }, []);

  if (!examples) return <div className="examples-menu">Loading…</div>;
  return (
    <div className="examples-menu" role="menu">
      {examples.map((example) => (
        <button
          key={`${example.language}:${example.name}`}
          type="button"
          role="menuitem"
          className="menu-item"
          onClick={() => props.onPick(example.spec)}
        >
          <IconSvg icon={resolveIcon(AUTO_ICON, example.language)} />
          <span className="examples-language">{example.language}</span>
          <span>{example.name}</span>
        </button>
      ))}
    </div>
  );
}
