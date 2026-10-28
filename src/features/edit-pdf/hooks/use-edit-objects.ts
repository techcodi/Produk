"use client";

import { useCallback, useReducer } from "react";
import type { EditObject } from "../types";

type Action =
  | { type: "add"; object: EditObject }
  | { type: "update"; id: string; patch: Partial<EditObject> }
  | { type: "remove"; id: string }
  | { type: "select"; id: string | null }
  | { type: "clear" };

interface State {
  objects: EditObject[];
  selectedId: string | null;
}

/** New text boxes that were never typed into are dropped as soon as they lose selection. */
const isBlankNewText = (object: EditObject | undefined) => object?.kind === "text" && !object.cover && object.text.trim() === "";

function dropBlankSelection(state: State, nextId: string | null): EditObject[] {
  const previous = state.objects.find((object) => object.id === state.selectedId);
  return previous && previous.id !== nextId && isBlankNewText(previous)
    ? state.objects.filter((object) => object.id !== previous.id)
    : state.objects;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "add":
      return { objects: [...dropBlankSelection(state, action.object.id), action.object], selectedId: action.object.id };
    case "update":
      return {
        ...state,
        objects: state.objects.map((object) => (object.id === action.id ? ({ ...object, ...action.patch } as EditObject) : object)),
      };
    case "remove":
      return {
        objects: state.objects.filter((object) => object.id !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      };
    case "select":
      if (action.id === state.selectedId) return state;
      return { objects: dropBlankSelection(state, action.id), selectedId: action.id };
    case "clear":
      return { objects: [], selectedId: null };
  }
}

export function useEditObjects() {
  const [state, dispatch] = useReducer(reducer, { objects: [], selectedId: null });

  return {
    objects: state.objects,
    selectedId: state.selectedId,
    select: useCallback((id: string | null) => dispatch({ type: "select", id }), []),
    add: useCallback((object: EditObject) => dispatch({ type: "add", object }), []),
    update: useCallback((id: string, patch: Partial<EditObject>) => dispatch({ type: "update", id, patch }), []),
    remove: useCallback((id: string) => dispatch({ type: "remove", id }), []),
    clear: useCallback(() => dispatch({ type: "clear" }), []),
  };
}

export type EditObjects = ReturnType<typeof useEditObjects>;
