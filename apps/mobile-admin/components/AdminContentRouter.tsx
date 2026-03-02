import { renderAdminCoreContent } from "./AdminContentRouterCore";
import { renderAdminOperationsContent } from "./AdminContentRouterOps";

type AdminContentRouterProps = {
  [key: string]: any;
};

export function AdminContentRouter(props: AdminContentRouterProps) {
  return renderAdminCoreContent(props) ?? renderAdminOperationsContent(props);
}
