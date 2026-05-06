import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const createBooking = createAsyncThunk('bookings/create', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/bookings', data);
    return res.data.booking;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const fetchMyBookings = createAsyncThunk('bookings/fetchMy', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/bookings/my');
    return res.data.bookings;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const cancelBooking = createAsyncThunk('bookings/cancel', async ({ id, reason }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/bookings/${id}/cancel`, { reason });
    return res.data.booking;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

const bookingSlice = createSlice({
  name: 'bookings',
  initialState: { list: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(createBooking.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?._id && !state.list.some((booking) => booking._id === action.payload._id)) {
          state.list.unshift(action.payload);
        }
      })
      .addCase(createBooking.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchMyBookings.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchMyBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchMyBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(cancelBooking.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(cancelBooking.fulfilled, (state, action) => {
        state.loading = false;
        const idx = state.list.findIndex(b => b._id === action.payload._id);
        if (idx !== -1) state.list[idx] = action.payload;
      })
      .addCase(cancelBooking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default bookingSlice.reducer;
