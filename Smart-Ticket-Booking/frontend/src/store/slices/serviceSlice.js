import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const searchServices = createAsyncThunk('services/search', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/services/search', { params });
    return res.data.services;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const fetchMyServices = createAsyncThunk('services/fetchMy', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/services/my/list');
    return res.data.services;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

const serviceSlice = createSlice({
  name: 'services',
  initialState: { list: [], myServices: [], loading: false, error: null },
  reducers: { clearServices: (state) => { state.list = []; } },
  extraReducers: (builder) => {
    builder
      .addCase(searchServices.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(searchServices.fulfilled, (state, action) => { state.loading = false; state.list = action.payload; })
      .addCase(searchServices.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchMyServices.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchMyServices.fulfilled, (state, action) => {
        state.loading = false;
        state.myServices = action.payload;
      })
      .addCase(fetchMyServices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearServices } = serviceSlice.actions;
export default serviceSlice.reducer;
