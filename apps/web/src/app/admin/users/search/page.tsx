"use client";

import { useEffect, useState } from "react";

type EmployeeRow = {
  id: string;
  name: string;
  email?: string;
};

export default function UserSearch() {
  const [query, setQuery] = useState("");
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/employees", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { employees: EmployeeRow[] };
      setEmployees(data.employees || []);
    };
    load();
  }, []);

  const results = employees.filter((employee) =>
    employee.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>User Search</h1>
      </div>

      <div className="admin-card">
        <label className="form-label">Search by name</label>
        <input
          className="form-control"
          placeholder="Start typing a name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="admin-card">
        <div className="table-responsive">
          <table className="table table-striped mb-0">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {results.map((employee) => (
                <tr key={employee.id}>
                  <td>{employee.name}</td>
                  <td>{employee.email || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
