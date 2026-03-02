import { GroupsCard } from "./GroupsCard";

type GroupsScreenProps = {
  [key: string]: any;
};

export function GroupsScreen(props: GroupsScreenProps) {
  return (
    <GroupsCard
      isLight={props.isLight}
      newGroupName={props.newGroupName}
      onNewGroupNameChange={props.setNewGroupName}
      groupStatus={props.groupStatus}
      inlineOrNull={props.inlineOrNull}
      onCreateGroup={props.handleCreateGroup}
      groups={props.groups}
    />
  );
}
