"use client";

import { useEffect, useState } from "react";
import {
  useUiCopy,
  useUiLanguage,
  type UiLang,
} from "../../../lib/ui-language";
import {
  deleteGroup,
  listGroups,
  listOffices,
  type Group,
  updateGroup,
} from "../../../lib/api/groups";

const copy: Record<UiLang, Record<string, string>> = {
  en: {
    title: "Group Summary",
    createGroup: "Create New Group",
    groupName: "Group Name",
    location: "Location",
    actions: "Actions",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    noLocation: "No location",
    updateSuccess: "Group updated.",
    deleteSuccess: "Group deleted.",
    updateFailed: "Unable to update group.",
    deleteFailed: "Unable to delete group.",
    confirmDelete: "Delete this group?",
    groupNameRequired: "Group name is required.",
    empty: "—",
  },
  es: {
    title: "Resumen de Grupos",
    createGroup: "Crear Nuevo Grupo",
    groupName: "Nombre del Grupo",
    location: "Ubicación",
    actions: "Acciones",
    edit: "Editar",
    delete: "Eliminar",
    save: "Guardar",
    cancel: "Cancelar",
    noLocation: "Sin ubicación",
    updateSuccess: "Grupo actualizado.",
    deleteSuccess: "Grupo eliminado.",
    updateFailed: "No se pudo actualizar el grupo.",
    deleteFailed: "No se pudo eliminar el grupo.",
    confirmDelete: "¿Eliminar este grupo?",
    groupNameRequired: "El nombre del grupo es obligatorio.",
    empty: "—",
  },
};

export default function GroupSummary() {
  const lang = useUiLanguage();
  const t = useUiCopy(copy, lang);
  const [groups, setGroups] = useState<Group[]>([]);
  const [officeMap, setOfficeMap] = useState<Record<string, string>>({});
  const [offices, setOffices] = useState<{ id: string; name: string }[]>([]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftOfficeId, setDraftOfficeId] = useState("");
  const [savingGroupId, setSavingGroupId] = useState<string | null>(null);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const loadGroups = async () => {
    try {
      const data = await listGroups();
      setGroups(data);
    } catch {
      // Keep current behavior: silently ignore failed loads.
    }
  };

  useEffect(() => {
    void loadGroups();
  }, []);

  useEffect(() => {
    const loadOffices = async () => {
      try {
        const officesData = await listOffices();
        const map: Record<string, string> = {};
        officesData.forEach((office) => {
          map[office.id] = office.name;
        });
        setOffices(officesData);
        setOfficeMap(map);
      } catch {
        // Keep current behavior: silently ignore failed loads.
      }
    };
    loadOffices();
  }, []);

  const startEditing = (group: Group) => {
    setStatus(null);
    setEditingGroupId(group.id);
    setDraftName(group.name);
    setDraftOfficeId(group.officeId || "");
  };

  const cancelEditing = () => {
    setEditingGroupId(null);
    setDraftName("");
    setDraftOfficeId("");
  };

  const saveEdit = async () => {
    if (!editingGroupId) return;
    const name = draftName.trim();
    if (!name) {
      setStatus(t.groupNameRequired);
      return;
    }

    setSavingGroupId(editingGroupId);
    setStatus(null);
    try {
      await updateGroup(editingGroupId, { name, officeId: draftOfficeId });
      setStatus(t.updateSuccess);
      cancelEditing();
      await loadGroups();
    } catch {
      setStatus(t.updateFailed);
    } finally {
      setSavingGroupId(null);
    }
  };

  const removeGroup = async (groupId: string) => {
    if (!window.confirm(t.confirmDelete)) {
      return;
    }
    setDeletingGroupId(groupId);
    setStatus(null);
    try {
      await deleteGroup(groupId);
      if (editingGroupId === groupId) {
        cancelEditing();
      }
      setStatus(t.deleteSuccess);
      await loadGroups();
    } catch {
      setStatus(t.deleteFailed);
    } finally {
      setDeletingGroupId(null);
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>{t.title}</h1>
        <div className="admin-actions">
          <a className="btn btn-primary" href="/admin/groups/new">
            {t.createGroup}
          </a>
        </div>
      </div>

      <div className="admin-card">
        {status ? <div className="alert alert-info">{status}</div> : null}
        <table className="table table-striped mb-0">
          <thead>
            <tr>
              <th>#</th>
              <th>{t.groupName}</th>
              <th>{t.location}</th>
              <th>{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group, index) => (
              <tr key={group.id}>
                <td>{index + 1}</td>
                <td>
                  {editingGroupId === group.id ? (
                    <input
                      className="form-control form-control-sm"
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                    />
                  ) : (
                    group.name
                  )}
                </td>
                <td>
                  {editingGroupId === group.id ? (
                    <select
                      className="form-select form-select-sm"
                      value={draftOfficeId}
                      onChange={(event) => setDraftOfficeId(event.target.value)}
                    >
                      <option value="">{t.noLocation}</option>
                      {offices.map((office) => (
                        <option key={office.id} value={office.id}>
                          {office.name}
                        </option>
                      ))}
                    </select>
                  ) : group.officeId ? (
                    officeMap[group.officeId] || t.empty
                  ) : (
                    t.empty
                  )}
                </td>
                <td className="d-flex gap-2">
                  {editingGroupId === group.id ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={saveEdit}
                        disabled={savingGroupId === group.id}
                      >
                        {t.save}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={cancelEditing}
                        disabled={savingGroupId === group.id}
                      >
                        {t.cancel}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => startEditing(group)}
                        disabled={deletingGroupId === group.id}
                      >
                        {t.edit}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => removeGroup(group.id)}
                        disabled={deletingGroupId === group.id}
                      >
                        {t.delete}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
