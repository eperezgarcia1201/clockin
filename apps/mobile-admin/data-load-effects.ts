import { useEffect } from "react";
import type { Screen } from "./types";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const useApiHealthProbeEffect = (params: {
  fetchJson: FetchJson;
  setDataSyncError: (value: string | null) => void;
}) => {
  useEffect(() => {
    let cancelled = false;

    const probeApi = async () => {
      try {
        await params.fetchJson("/health");
        if (!cancelled) {
          params.setDataSyncError(null);
        }
      } catch (error) {
        if (!cancelled) {
          params.setDataSyncError(
            error instanceof Error
              ? error.message
              : "Unable to reach ClockIn API.",
          );
        }
      }
    };

    void probeApi();

    return () => {
      cancelled = true;
    };
  }, [params.fetchJson]);
};

export const useAdminDataLoadEffects = (params: {
  loggedIn: boolean;
  screen: Screen;
  scopedLocationId: string;
  scheduleEmployeeId: string;
  loadAccessProfile: () => void | Promise<void>;
  loadSummary: () => void | Promise<void>;
  loadEmployees: () => void | Promise<void>;
  loadOffices: () => void | Promise<void>;
  loadGroups: () => void | Promise<void>;
  loadActiveNow: () => void | Promise<void>;
  loadNotifications: () => void | Promise<void>;
  loadTodaySchedule: () => Promise<void>;
  loadSchedule: (employeeId: string) => Promise<void>;
}) => {
  useEffect(() => {
    if (!params.loggedIn) return;
    void params.loadAccessProfile();
    void params.loadSummary();
    void params.loadEmployees();
    void params.loadOffices();
    void params.loadGroups();
    void params.loadActiveNow();
    void params.loadNotifications();
  }, [params.loggedIn, params.scopedLocationId]);

  useEffect(() => {
    if (!params.loggedIn) return;
    if (params.screen === "alerts") {
      void params.loadNotifications();
    }
  }, [params.loggedIn, params.screen]);

  useEffect(() => {
    if (!params.loggedIn) return;
    if (params.screen === "schedules") {
      void params.loadTodaySchedule();
      if (params.scheduleEmployeeId) {
        void params.loadSchedule(params.scheduleEmployeeId);
      }
    }
  }, [
    params.loggedIn,
    params.screen,
    params.scheduleEmployeeId,
    params.scopedLocationId,
  ]);

  useEffect(() => {
    if (!params.loggedIn) return;
    if (params.screen === "dashboard") {
      void params.loadActiveNow();
      void params.loadNotifications();
      void params.loadSummary();
      return;
    }
    if (params.screen === "users") {
      void params.loadEmployees();
      void params.loadActiveNow();
      void params.loadSummary();
    }
    if (params.screen === "groups") {
      void params.loadGroups();
    }
  }, [params.loggedIn, params.screen, params.scopedLocationId]);

  useEffect(() => {
    if (!params.loggedIn || params.screen !== "dashboard") {
      return;
    }
    const timer = setInterval(() => {
      void params.loadActiveNow();
      void params.loadNotifications();
    }, 60_000);
    return () => {
      clearInterval(timer);
    };
  }, [params.loggedIn, params.screen, params.scopedLocationId]);
};

export const useVisibleTabSyncEffect = (params: {
  loggedIn: boolean;
  screen: Screen;
  visibleTabs: Screen[];
  setScreen: (screen: Screen) => void;
}) => {
  useEffect(() => {
    if (!params.loggedIn) {
      return;
    }
    if (params.visibleTabs.length === 0) {
      return;
    }
    if (!params.visibleTabs.includes(params.screen)) {
      params.setScreen(params.visibleTabs[0]);
    }
  }, [params.loggedIn, params.screen, params.visibleTabs]);
};
