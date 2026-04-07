import { create } from 'zustand';

export interface ActionSheetAction {
  label: string;
  onPress?: () => void | Promise<void>;
  destructive?: boolean;
  disabled?: boolean;
}

interface ActionSheetState {
  title: string;
  actions: ActionSheetAction[];
  visible: boolean;
  showActionSheet: (title: string, actions: ActionSheetAction[]) => void;
  hideActionSheet: () => void;
}

export const useActionSheetStore = create<ActionSheetState>((set) => ({
  title: '',
  actions: [],
  visible: false,
  showActionSheet: (title, actions) => set({ title, actions, visible: true }),
  hideActionSheet: () => set({ visible: false }),
}));
