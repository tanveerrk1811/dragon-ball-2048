import { useEffect, useRef } from "react";
import { mountGame } from "./game/ui";

/**
 * Thin host for the vanilla TypeScript game (src/game/*). React is only the build scaffold of this
 * workspace; the game engine, UI and advertising modules contain no React code.
 */
export default function App() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    return mountGame(ref.current);
  }, []);
  return <div ref={ref} />;
}
