import mongoose from '../../config/mongo.js';

const { Schema, model } = mongoose;

// Alto volumen de escritura y forma variable por tipo de evento -> encaja bien en Mongo.
const notificationSchema = new Schema({
  userId: { type: Number, required: true, index: true },
  type: { type: String, required: true }, // 'reservation_created' | 'reservation_confirmed' | 'reservation_cancelled' | 'review_received'
  message: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  read: { type: Boolean, default: false },
}, { timestamps: true });

export default model('Notification', notificationSchema);
