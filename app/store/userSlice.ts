
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UserState {
  userId: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
  apiAccessToken: string | null;
}

const initialState: UserState = {
  userId: null,
  name: null,
  email: null,
  image: null,
  apiAccessToken: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<UserState>) {
      return action.payload;
    },

    clearUser() {
      return initialState;
    },
  },
});

export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;
