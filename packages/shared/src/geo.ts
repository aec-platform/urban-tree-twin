import { z } from 'zod';

export const Longitude = z.number().min(-180).max(180);
export const Latitude = z.number().min(-90).max(90);

export const LngLat = z.object({
  lng: Longitude,
  lat: Latitude,
});
export type LngLat = z.infer<typeof LngLat>;

export const PointGeoJSON = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([Longitude, Latitude]),
});
export type PointGeoJSON = z.infer<typeof PointGeoJSON>;

export const PolygonGeoJSON = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.tuple([Longitude, Latitude]))).min(1),
});
export type PolygonGeoJSON = z.infer<typeof PolygonGeoJSON>;

export const BBox = z.tuple([Longitude, Latitude, Longitude, Latitude]);
export type BBox = z.infer<typeof BBox>;

export const lngLatToPointGeoJSON = (p: LngLat): PointGeoJSON => ({
  type: 'Point',
  coordinates: [p.lng, p.lat],
});
