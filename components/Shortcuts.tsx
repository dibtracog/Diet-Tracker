const GROUPS: { title: string; items: [keys: string[], label: string][] }[] = [
  {
    title: "Anywhere",
    items: [
      [["N"], "Add entry"],
      [["P"], "Paste AI entry"],
      [["/"], "Search your library"],
      [["1"], "Today"],
      [["2"], "Library"],
      [["3"], "History"],
      [["4"], "Settings"],
      [["?"], "Show these shortcuts"],
      [["Esc"], "Close a sheet"],
    ],
  },
  {
    title: "Today",
    items: [
      [["←", "→"], "Previous / next day"],
      [["Shift", "←"], "Previous week (Shift + → next)"],
      [["T"], "Jump to today"],
      [["W"], "Add 250 ml water"],
    ],
  },
  {
    title: "On your phone",
    items: [
      [["Swipe"], "Left or right on Today to change day"],
      [["Swipe"], "On the week row to change week"],
      [["Drag"], "A sheet down to close it"],
    ],
  },
];

export default function ShortcutsList() {
  return (
    <div className="shortcuts">
      {GROUPS.map((g) => (
        <section key={g.title} className="shortcut-group">
          <h3>{g.title}</h3>
          {g.items.map(([keys, label]) => (
            <div key={label} className="shortcut-row">
              <span>{label}</span>
              <span className="shortcut-keys">
                {keys.map((k) => (
                  <kbd key={k}>{k}</kbd>
                ))}
              </span>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
