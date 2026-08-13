import mongoose from '../../config/mongo.js';

const { Schema, model } = mongoose;

// Esquema flexible: no todas las reseñas necesitan las mismas propiedades
// (tags, fotos, respuesta del dueño, etc.), ideal para MongoDB en vez de una tabla rígida.
const reviewSchema = new Schema({
  venueId: { type: Number, required: true, index: true },
  userId: { type: Number, required: true },
  userName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },
  tags: { type: [String], default: [] },
  ownerReply: { type: String, default: null },
}, { timestamps: true });

export default model('Review', reviewSchema);
