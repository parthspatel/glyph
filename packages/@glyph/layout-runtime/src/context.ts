import { createContext, useContext } from "react";
import type { LayoutContext } from "./types";

const LayoutContextReact = createContext<LayoutContext | null>(null);

export function useLayoutContext(): LayoutContext {
  const context = useContext(LayoutContextReact);
  if (!context) {
    throw new Error("useLayoutContext must be used within a LayoutRenderer");
  }
  return context;
}

export const LayoutContextProvider = LayoutContextReact.Provider;
