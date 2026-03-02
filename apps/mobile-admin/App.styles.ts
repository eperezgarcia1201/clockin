import { StyleSheet } from "react-native";
import { adminAppStylesBase } from "./App.styles.base";
import { adminAppStylesListing } from "./App.styles.listing";
import { adminAppStylesSchedule } from "./App.styles.schedule";
import { adminAppStylesCalendar } from "./App.styles.calendar";
import { adminAppStylesFooter } from "./App.styles.footer";

export const styles = StyleSheet.create({
  ...adminAppStylesBase,
  ...adminAppStylesListing,
  ...adminAppStylesSchedule,
  ...adminAppStylesCalendar,
  ...adminAppStylesFooter,
});
