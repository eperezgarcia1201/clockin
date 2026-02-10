"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type EmployeeRow = {
  id: string;
  name: string;
  active: boolean;
  email?: string;
  officeId?: string | null;
  groupId?: string | null;
  isAdmin?: boolean;
  isTimeAdmin?: boolean;
  isReports?: boolean;
};

type Office = { id: string; name: string };
type Group = { id: string; name: string };

export default function UsersSummary() {
  const searchParams = useSearchParams();
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [officeMap, setOfficeMap] = useState<Record<string, string>>({});
  const [groupMap, setGroupMap] = useState<Record<string, string>>({});
  const [showAdminsOnly, setShowAdminsOnly] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/employees", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { employees: EmployeeRow[] };
        setEmployees(data.employees || []);
      } catch {
        // ignore
      }
    };

    load();
  }, []);

  useEffect(() => {
    const loadLookups = async () => {
      const [officesRes, groupsRes] = await Promise.all([
        fetch("/api/offices"),
        fetch("/api/groups"),
      ]);
      if (officesRes.ok) {
        const data = (await officesRes.json()) as { offices: Office[] };
        const map: Record<string, string> = {};
        data.offices?.forEach((office) => {
          map[office.id] = office.name;
        });
        setOfficeMap(map);
      }
      if (groupsRes.ok) {
        const data = (await groupsRes.json()) as { groups: Group[] };
        const map: Record<string, string> = {};
        data.groups?.forEach((group) => {
          map[group.id] = group.name;
        });
        setGroupMap(map);
      }
    };

    loadLookups();
  }, []);

  useEffect(() => {
    const role = searchParams.get("role") || "";
    setRoleFilter(role);
    setShowAdminsOnly(role === "admin");
  }, [searchParams]);

  const filteredEmployees = useMemo(() => {
    if (roleFilter === "admin") {
      return employees.filter((employee) => employee.isAdmin);
    }
    if (roleFilter === "time") {
      return employees.filter((employee) => employee.isTimeAdmin);
    }
    if (roleFilter === "reports") {
      return employees.filter((employee) => employee.isReports);
    }
    return showAdminsOnly
      ? employees.filter((employee) => employee.isAdmin)
      : employees;
  }, [employees, roleFilter, showAdminsOnly]);

  const handleDelete = async (employeeId: string) => {
    setStatus(null);
    const ok = confirm("Disable this user? They will no longer appear active.");
    if (!ok) return;
    const response = await fetch(`/api/employees/${employeeId}`, {
      method: "DELETE",
    });
    if (response.ok) {
      setEmployees((prev) =>
        prev.map((employee) =>
          employee.id === employeeId
            ? { ...employee, active: false }
            : employee,
        ),
      );
      setStatus("User disabled.");
    } else {
      setStatus("Unable to disable user.");
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>User Summary</h1>
        <div className="admin-actions">
          <a className="btn btn-primary" href="/admin/users/new">
            Create New User
          </a>
        </div>
      </div>

      <div className="admin-card">
        {status && <div className="alert alert-info">{status}</div>}
        <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
          <input
            id="adminsOnly"
            type="checkbox"
            checked={showAdminsOnly}
            onChange={(event) => setShowAdminsOnly(event.target.checked)}
          />
          <label htmlFor="adminsOnly">Show admins only</label>
          {roleFilter && (
            <a className="btn btn-sm btn-outline-secondary" href="/admin/users">
              Clear role filter
            </a>
          )}
        </div>
        <div className="table-responsive">
          <table className="table table-striped align-middle mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Username</th>
                <th>Email</th>
                <th>Office</th>
                <th>Group</th>
                <th>Disabled</th>
                <th>Sys Admin</th>
                <th>Time Admin</th>
                <th>Reports</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee, index) => (
                <tr key={employee.id}>
                  <td>{index + 1}</td>
                  <td>{employee.name}</td>
                  <td>{employee.email || "—"}</td>
                  <td>
                    {employee.officeId
                      ? officeMap[employee.officeId] || "—"
                      : "—"}
                  </td>
                  <td>
                    {employee.groupId
                      ? groupMap[employee.groupId] || "—"
                      : "—"}
                  </td>
                  <td>{employee.active ? "" : "Yes"}</td>
                  <td>{employee.isAdmin ? "Yes" : ""}</td>
                  <td>{employee.isTimeAdmin ? "Yes" : ""}</td>
                  <td>{employee.isReports ? "Yes" : ""}</td>
                  <td>
                    <div className="d-flex gap-2">
                      <a
                        className="btn btn-sm btn-outline-primary"
                        href={`/admin/users/${employee.id}`}
                      >
                        Edit
                      </a>
                      <a
                        className="btn btn-sm btn-outline-secondary"
                        href={`/admin/time?${new URLSearchParams({
                          employeeId: employee.id,
                          returnTo: "/admin/users",
                        }).toString()}`}
                      >
                        Edit Times
                      </a>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(employee.id)}
                      >
                        Disable
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
