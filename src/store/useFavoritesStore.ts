import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

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

type FavStop = Extract<Favorite, { kind: 'stop' }>;
type FavRoute = Extract<Favorite, { kind: 'route' }>;
type FavPlace = Extract<Favorite, { kind: 'place' }>;

export const selectFavoriteStops = (s: FavoritesState): FavStop[] =>
  s.favorites.filter((f): f is FavStop => f.kind === 'stop');
export const selectFavoriteRoutes = (s: FavoritesState): FavRoute[] =>
  s.favorites.filter((f): f is FavRoute => f.kind === 'route');
export const selectFavoritePlaces = (s: FavoritesState): FavPlace[] =>
  s.favorites.filter((f): f is FavPlace => f.kind === 'place');

/** `.find` returns a stable element — safe to use directly as a selector. */
export const selectHomePlace = (s: FavoritesState): FavPlace | undefined =>
  s.favorites.find((f): f is FavPlace => f.kind === 'place' && f.slot === 'home');
export const selectWorkPlace = (s: FavoritesState): FavPlace | undefined =>
  s.favorites.find((f): f is FavPlace => f.kind === 'place' && f.slot === 'work');

/*
 * `.filter` returns a new array each call; wrap with `useShallow` so an
 * unchanged list keeps a stable reference and does not trigger an infinite
 * re-render loop under Zustand v5 / useSyncExternalStore.
 */
export const useFavoriteStops = (): FavStop[] =>
  useFavoritesStore(useShallow(selectFavoriteStops));
export const useFavoriteRoutes = (): FavRoute[] =>
  useFavoritesStore(useShallow(selectFavoriteRoutes));
export const useFavoritePlaces = (): FavPlace[] =>
  useFavoritesStore(useShallow(selectFavoritePlaces));
