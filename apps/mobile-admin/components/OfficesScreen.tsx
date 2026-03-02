import { OfficesCard } from "./OfficesCard";

type OfficesScreenProps = {
  [key: string]: any;
};

export function OfficesScreen(props: OfficesScreenProps) {
  return (
    <OfficesCard
      isLight={props.isLight}
      text={props.text}
      activeLocationLabel={props.activeLocationLabel}
      canManageMultiLocation={props.canManageMultiLocation}
      scopedLocationId={props.scopedLocationId}
      offices={props.offices}
      onActiveLocationChange={props.setActiveLocationId}
      canCreateLocations={props.canCreateLocations}
      newOfficeName={props.newOfficeName}
      onNewOfficeNameChange={props.setNewOfficeName}
      newOfficeLatitude={props.newOfficeLatitude}
      onNewOfficeLatitudeChange={props.setNewOfficeLatitude}
      newOfficeLongitude={props.newOfficeLongitude}
      onNewOfficeLongitudeChange={props.setNewOfficeLongitude}
      newOfficeRadius={props.newOfficeRadius}
      onNewOfficeRadiusChange={props.setNewOfficeRadius}
      onCreateOffice={props.handleCreateOffice}
      officeStatus={props.officeStatus}
      inlineOrNull={props.inlineOrNull}
      officeGeoTarget={props.officeGeoTarget}
      officeGeoLatitude={props.officeGeoLatitude}
      onOfficeGeoLatitudeChange={props.setOfficeGeoLatitude}
      officeGeoLongitude={props.officeGeoLongitude}
      onOfficeGeoLongitudeChange={props.setOfficeGeoLongitude}
      officeGeoRadius={props.officeGeoRadius}
      onOfficeGeoRadiusChange={props.setOfficeGeoRadius}
      officeGeoSaving={props.officeGeoSaving}
      onSaveOfficeGeofence={props.handleSaveOfficeGeofence}
      inline={props.inline}
      language={props.language}
      officeGeoStatus={props.officeGeoStatus}
      onSwitchOffice={(officeId) => {
        props.setActiveLocationId(officeId);
        props.setScreen("dashboard");
      }}
    />
  );
}
