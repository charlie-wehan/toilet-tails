"use client";

export const SCENES = [
  { id: "royal-throne", label: "Royal Throne", emoji: "👑🚽" },
  { id: "bubble-bath", label: "Bubble Bath", emoji: "🫧🛁" },
  { id: "mirror-selfie", label: "Mirror Selfie", emoji: "🪞🐶" },
  { id: "newspaper", label: "Morning Paper", emoji: "📰🚽" },
  { id: "spa-day", label: "Spa Day", emoji: "🕯️🛁" },
  { id: "tp-tornado", label: "TP Tornado", emoji: "🧻🌪️" },
] as const;

export type SceneId = (typeof SCENES)[number]["id"];

type Props = {
  value?: SceneId;
  onChange?: (scene: SceneId) => void;
};

export default function ScenePicker({ value, onChange }: Props) {
  // If parent doesn't control value, manage it internally
  const selected = value ?? SCENES[0].id;

  function select(id: SceneId) {
    onChange?.(id);
  }

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold">Choose a scene</h3>
      <p className="text-sm text-gray-500">We'll guide the AI with this vibe.</p>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
        {SCENES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => select(s.id)}
            className={`rounded-2xl border p-4 text-left transition ${
              selected === s.id
                ? "ring-2 ring-indigo-600 border-indigo-600"
                : "hover:bg-gray-50"
            }`}
          >
            <div className="text-2xl">{s.emoji}</div>
            <div className="mt-2 text-sm font-medium">{s.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
