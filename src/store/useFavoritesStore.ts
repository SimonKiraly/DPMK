import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { storageKeys } from '@/constants/config';
import { getRoute } from '@/data/routes';
import { getStop } from '@/data/stops';
import { PLACE_BY_ID } from '@/data/places';
import type { Favorite, FavoritePlace, LatLng, TransportMode } from '@/types';
import { createId } from '@/utils/id';
import { zustandStorage } from '@/store/persist';

interface FavoritesState {
  favorites: Favorite[];
  hydrated: boolean;

  isStopSaved: (stopId: string) => boolean;
  isRouteSaved: (routeId: string) => boolean;
  toggleStop: (stopId: string) => void;
  toggleRoute: (routeShortName: string, headsign: string) => void;
  toggleRouteAlerts: (favoriteId: string) => void;
  setPlace: (slot: 'home' | 'work' | 'custom', input: {
    label: string;
    placeName: string;
    location: LatLng;
    nearestStopId: string;
  }) => void;
  setPlaceFromPlaceId: (slot: 'home' | 'work', placeId: string) => void;
  removeFavorite: (favoriteId: string) => void;
  reset: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      hydrated: false,

      isStopSaved(stopId) {
        return get().favorites.some((f) => f.kind === 'stop' && f.stopId === stopId);
      },

      isRouteSaved(routeId) {
        return get().favorites.some((f) => f.kind === 'route' && f.routeId === routeId);
      },

      toggleStop(stopId) {
        const stop = getStop(stopId);
        if (!stop) return;
        set((s) => {
          const existing = s.favorites.find((f) => f.kind === 'stop' && f.stopId === stopId);
          if (existing) return { favorites: s.favorites.filter((f) => f.id !== existing.id) };
          return {
            favorites: [
              {
                kind: 'stop',
                id: createId('fav'),
                stopId,
                name: stop.name,
                lines: stop.lines,
                addedAt: new Date().toISOString(),
              },
              ...s.favorites,
            ],
          };
        });
      },

      toggleRoute(routeShortName, headsign) {
        const route = getRoute(routeShortName);
        if (!route) return;
        set((s) => {
          const existing = s.favorites.find((f) => f.kind === 'route' && f.routeId === route.id);
          if (existing) return { favorites: s.favorites.filter((f) => f.id !== existing.id) };
          return {
            favorites: [
              {
                kind: 'route',
                id: createId('fav'),
                routeId: route.id,
                shortName: route.shortName,
                headsign,
                mode: route.mode as TransportMode,
                alertsEnabled: true,
                addedAt: new Date().toISOString(),
              },
              ...s.favorites,
            ],
          };
        });
      },

      toggleRouteAlerts(favoriteId) {
        set((s) => ({
          favorites: s.favorites.map((f) =>
            f.kind === 'route' && f.id === favoriteId ? { ...f, alertsEnabled: !f.alertsEnabled } : f,
          ),
        }));
      },

      setPlace(slot, input) {
        const place: FavoritePlace = {
          kind: 'place',
          id: createId('fav'),
          slot,
          label: input.label,
          placeName: input.placeName,
          location: input.location,
          nearestStopId: input.nearestStopId,
          addedAt: new Date().toISOString(),
        };
        set((s) => ({
          favorites: [
            place,
            ...s.favorites.filter((f) => !(f.kind === 'place' && f.slot === slot && slot !== 'custom')),
          ],
        }));
      },

      setPlaceFromPlaceId(slot, placeId) {
        const place = PLACE_BY_ID[placeId];
        if (!place) return;
        get().setPlace(slot, {
          label: slot === 'home' ? 'Domov' : 'Práca',
          placeName: place.name,
          location: place.location,
          nearestStopId: place.nearestStopId,
        });
      },

      removeFavorite(favoriteId) {
        set((s) => ({ favorites: s.favorites.filter((f) => f.id !== favoriteId) }));
      },

      reset() {
        set({ favorites: [] });
      },
    }),
    {
      name: storageKeys.favorites,
      storage: zustandStorage,
      partialize: (s) => ({ favorites: s.favorites }),
      onRehydrateStorage: () => () => {
        useFavoritesStore.setState({ hydrated: true });
      },
    },
  ),
);

export const selectFavoriteStops = (s: FavoritesState) =>
  s.favorites.filter((f): f is Extract<Favorite, { kind: 'stop' }> => f.kind === 'stop');
export const selectFavoriteRoutes = (s: FavoritesState) =>
  s.favorites.filter((f): f is Extract<Favorite, { kind: 'route' }> => f.kind === 'route');
export const selectFavoritePlaces = (s: FavoritesState) =>
  s.favorites.filter((f): f is Extract<Favorite, { kind: 'place' }> => f.kind === 'place');
export const selectHomePlace = (s: FavoritesState) =>
  selectFavoritePlaces(s).find((p) => p.slot === 'home');
export const selectWorkPlace = (s: FavoritesState) =>
  selectFavoritePlaces(s).find((p) => p.slot === 'work');
