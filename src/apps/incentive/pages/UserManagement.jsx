'use client';
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Layout from "@incentive/components/Layout";
import { useAuth } from "@incentive/lib/AuthContext";
import { supabase } from "@incentive/api/supabaseClient";

import {
  UserPlus,
  Shield,
  User as UserIcon,
  AlertCircle,
  Pencil,
  Ban,
  CheckCircle2,
  Building2,
  MapPin,
  X,
  Save,
  Trash2,
} from "lucide-react";
  import Loader from '@/components/Loader';

const ROLES = [
  { value: "HS-ADMIN", label: "HS Admin", desc: "Full system access", color: "bg-[#46286E] text-white" },
  { value: "ADMIN", label: "Admin", desc: "Full access", color: "bg-[#0EA5E9] text-white" },
  { value: "COUNTRY-MANAGER", label: "Country Manager", desc: "All branches", color: "bg-[#D6EEFF] text-[#21264E]" },
  { value: "UK-ADMIN", label: "UK Admin", desc: "UK branches only", color: "bg-[#1E3A8A] text-white" },
  { value: "RSM", label: "Regional Manager", desc: "Multiple branches", color: "bg-[#006AE0] text-white" },
  { value: "ASM", label: "Area Manager", desc: "Single branch", color: "bg-[#08DC7D] text-white" },
  { value: "ZONE-MANAGER", label: "Zone Manager", desc: "Single zone", color: "bg-[#0891B2] text-white" },
];

const roleBadge = (role) => {
  const r = ROLES.find((x) => x.value === role) || ROLES[5];
  return { color: r.color, text: r.label, Icon: r.value === "ZONE-MANAGER" ? MapPin : Building2 };
};

const ROLE_BRANCH_LIMITS = {
  "HS-ADMIN": null,
  ADMIN: null,
  "COUNTRY-MANAGER": null,
  "UK-ADMIN": null,
  RSM: 4,
  ASM: 1,
};

const invokeAdminApi = async (body) => {
  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const accessToken = data?.session?.access_token;
  if (!accessToken) throw new Error("Your session has expired. Please sign in again.");

  const response = await fetch("/api/admin-create-user", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || "Admin user operation failed.");
  return result;
};

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "ASM",
    branches: [],
    zone_id: "",
  });

  const isAdmin = user?.role === "ADMIN" || user?.role === "HS-ADMIN";
  const isHSAdmin = user?.role === "HS-ADMIN";

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [uRes, bRes, zRes] = await Promise.all([
                supabase
          .from("profiles")
          .select("id, email, full_name, role, is_disabled, branches, branch, zone, zone_id")
                    .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("branches").select("id, code, name").order("code"),
        supabase.from("zones").select("id, code, name, branch_id").order("name"),
      ]);

      if (uRes.error) throw uRes.error;
      if (bRes.error) throw bRes.error;
      if (zRes.error) throw zRes.error;

      setUsers(uRes.data || []);
      setBranches(bRes.data || []);
      setZones(zRes.data || []);
    } catch (e) {
      setError(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Branch codes are what every tool in the suite stores. The Incentive
  // Statement used to write branch uuids, which no other tool could resolve, so
  // anything coming in (uuid, code or name) is normalised to a branch code.
  const branchCodeOf = useCallback(
    (value) => {
      const wanted = String(value || "").trim().toLowerCase();
      if (!wanted) return null;
      const match = branches.find((b) =>
        [b.id, b.code, b.name].some(
          (candidate) => String(candidate || "").trim().toLowerCase() === wanted
        )
      );
      return match ? match.code : String(value).trim();
    },
    [branches]
  );

  const branchLabel = useCallback(
    (code) => {
      const wanted = String(code || "").trim().toLowerCase();
      const match = branches.find(
        (b) =>
          String(b.code || "").trim().toLowerCase() === wanted ||
          String(b.id || "").trim().toLowerCase() === wanted
      );
      return match?.name || match?.code || code;
    },
    [branches]
  );

  const needsBranches = (role) =>
    role && ["HS-ADMIN", "ADMIN", "COUNTRY-MANAGER", "UK-ADMIN", "RSM", "ASM"].includes(role);

  const needsZone = (role) => role === "ZONE-MANAGER";

  const branchLimit = (role) => {
    if (role === "RSM") return 4;
    if (role === "ASM") return 1;
    return null;
  };

  // A Zone Manager's zone list is limited to the branch they are responsible
  // for (one zone only, same rule as FIELD IQ).
  const zoneOptions = useMemo(() => {
    const branchCode = (form.branches || [])[0];
    if (!branchCode) return zones;
    const branch = branches.find((b) => b.code === branchCode);
    if (!branch) return zones;
    const filtered = zones.filter((z) => z.branch_id === branch.id);
    return filtered.length > 0 ? filtered : zones;
  }, [branches, zones, form.branches]);

  const resetForm = () => {
    setForm({
      email: "",
      password: "",
      full_name: "",
      role: "ASM",
      branches: [],
      zone_id: "",
    });
    setEditingId(null);
    setOpenForm(false);
  };

  const openCreate = () => {
    resetForm();
    setOpenForm(true);
  };

  const openEdit = (row) => {
    const assigned = (row.branches || []).length > 0
      ? row.branches
      : row.branch
        ? [row.branch]
        : [];
    setEditingId(row.id);
    setForm({
      email: row.email || "",
      password: "",
      full_name: row.full_name || "",
      role: row.role || "ASM",
      // `profiles.branches` holds branch codes (uuid rows written before the
      // FIELD IQ parity migration are resolved through the branches table).
      branches: assigned.map((value) => branchCodeOf(value)).filter(Boolean),
      zone_id: row.zone_id || "",
    });
    setOpenForm(true);
  };

  const handleFormChange = (field, value) => {
    const next = { ...form, [field]: value };
    if (field === "role") {
      if (needsBranches(value)) {
        next.branches = [];
        next.zone_id = "";
      } else if (needsZone(value)) {
        next.branches = [];
        next.zone_id = "";
      } else {
        next.branches = [];
        next.zone_id = "";
      }
    }
    setForm(next);
  };

  const toggleBranch = (branchCode) => {
    const current = form.branches || [];
    const exists = current.includes(branchCode);
    const limit = branchLimit(form.role);
    let next;
    if (exists) {
      next = current.filter((b) => b !== branchCode);
    } else {
      if (limit !== null && current.length >= limit) {
        setError(
          `Maximum ${limit} branch${limit === 1 ? "" : "es"} allowed for ${
            ROLES.find((r) => r.value === form.role)?.label
          } role.`
        );
        return;
      }
      next = [...current, branchCode];
    }
    setForm({ ...form, branches: next });
    if (error) setError("");
  };

  const validateForm = () => {
    if (!editingId && !form.email.trim()) {
      setError("Email is required when creating a new user.");
      return false;
    }
    if (!editingId && form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return false;
    }
    if (!form.role) {
      setError("Role is required.");
      return false;
    }
    if (["RSM", "ASM"].includes(form.role) && (form.branches || []).length === 0) {
      const roleLabel = ROLES.find((r) => r.value === form.role)?.label || "this";
      setError(`At least one branch is required for the ${roleLabel} role.`);
      return false;
    }
    if (needsZone(form.role) && !form.zone_id) {
      setError("Zone is required for the Zone Manager role.");
      return false;
    }
    const limit = branchLimit(form.role);
    if (limit !== null && (form.branches || []).length > limit) {
      setError(
        `Maximum ${limit} branch${limit === 1 ? "" : "es"} allowed for ${
          ROLES.find((r) => r.value === form.role)?.label
        } role.`
      );
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const branchLimitForRole = branchLimit(form.role);
      // Branch codes are stored; admin roles may either be restricted to the
      // branches picked here or, with none picked, keep the whole country.
      const sendBranches = branchLimitForRole === null
        ? (form.branches || [])
        : (form.branches || []).slice(0, branchLimitForRole);
      if (editingId) {
        await invokeAdminApi({
          action: "update",
          user_id: editingId,
          email: form.email.trim(),
          full_name: form.full_name.trim() || null,
          role: form.role,
          branches: sendBranches,
          zone_id: form.zone_id || null,
        });
        setSuccess("User updated successfully.");
      } else {
        await invokeAdminApi({
          email: form.email.trim(),
          password: form.password,
          full_name: form.full_name.trim() || null,
          role: form.role,
          branches: sendBranches,
          zone_id: form.zone_id || null,
        });
        setSuccess("User created and profile assigned successfully.");
      }
      resetForm();
      await loadAll();
    } catch (e) {
      let message = e?.message || "Failed to save.";
      if (e?.context instanceof Response) {
        try {
          const details = await e.context.json();
          message = details?.error || message;
        } catch {
        }
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteUser = async (row) => {
    if (row.id === user?.id) return;
    const label = row.email || row.full_name || "this user";
    if (!window.confirm(`Permanently remove ${label}? This cannot be undone.`)) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await invokeAdminApi({ action: "delete", user_id: row.id });
      setSuccess("User removed successfully.");
      await loadAll();
    } catch (e) {
      let message = e?.message || "Failed to remove user.";
      if (e?.context instanceof Response) {
        try {
          const details = await e.context.json();
          message = details?.error || message;
        } catch {
        }
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDisable = async (row) => {
    const verb = row.is_disabled ? "Enable" : "Disable";
    const label = row.email || row.full_name || "this user";
    if (!window.confirm(`${verb} user ${label}?`)) return;
    try {
      await invokeAdminApi({
        action: "disable",
        user_id: row.id,
        is_disabled: !row.is_disabled,
      });
      setSuccess(`User ${verb.toLowerCase()}d.`);
      await loadAll();
    } catch (err) {
      setError(err?.message || "Toggle failed.");
    }
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="p-8 max-w-3xl mx-auto text-center">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-700">Admin access required</h2>
          <p className="text-sm text-slate-500 mt-1">You need admin privileges to manage users.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        <div
          className="rounded-xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          style={{ backgroundColor: "#21264e" }}
        >
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5" /> User Management
            </h1>
            <p className="text-sm text-white/70 mt-1">
              Admin-only: create users and assign roles & branch/zone scope.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-[#21264e]"
            style={{ backgroundColor: "#08dc7d" }}
          >
            <UserPlus className="w-4 h-4" /> Create User
          </button>
        </div>

        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex gap-2 text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            New users are created in Supabase Auth and assigned their application profile automatically. You can
            edit, disable, enable, or permanently remove users from this page.
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
          </div>
        )}

        {openForm && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                {editingId ? (
                  <><Pencil className="w-4 h-4 text-[#006AE0]" /> Edit User</>
                ) : (
                    <><UserPlus className="w-4 h-4 text-[#08dc7d]" /> Create New User</>
                )}
              </h2>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wide">Full Name</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => handleFormChange("full_name", e.target.value)}
                  placeholder="Display name"
                  className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#006AE0]"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wide">
                  Email {!editingId && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="email"
                  disabled={!!editingId}
                  value={form.email}
                  onChange={(e) => handleFormChange("email", e.target.value)}
                  placeholder="name@example.com"
                  className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#006AE0] disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>

              {!editingId && (
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wide">
                    Temporary Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => handleFormChange("password", e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#006AE0]"
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="text-xs text-slate-500 uppercase tracking-wide">Role</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-1">
                  {ROLES.map((r) => {
                    const active = form.role === r.value;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => handleFormChange("role", r.value)}
                        className={`text-left rounded-lg border p-3 transition ${
                          active
                            ? "border-[#006AE0] bg-[#006AE0]/5 ring-1 ring-[#006AE0]"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="text-sm font-semibold text-slate-800">{r.label}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{r.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

                            {needsBranches(form.role) && (
                <div className="md:col-span-2">
                  <label className="text-xs text-slate-500 uppercase tracking-wide">
                    Branches{" "}
                    {["RSM", "ASM"].includes(form.role) && (
                      <span className="text-red-500">*</span>
                    )}
                    {branchLimit(form.role) !== null && (
                      <span className="text-gray-400 normal-case font-normal ml-2">
                        ({form.branches?.length || 0}{" "}
                        {branchLimit(form.role) === 1
                          ? "selected"
                          : "selected"}
                        {branchLimit(form.role) === 1
                          ? ""
                          : `, max ${branchLimit(form.role)}`})
                      </span>
                    )}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                    {branches.map((b) => {
                      const checked = (form.branches || []).includes(b.code);
                      const limit = branchLimit(form.role);
                      const limitReached =
                        limit !== null &&
                        !checked &&
                        (form.branches || []).length >= limit;
                      return (
                        <label
                          key={b.code}
                          className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${
                            checked
                              ? "border-[#006AE0] bg-[#006AE0]/5"
                              : limitReached
                              ? "border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="w-3.5 h-3.5 rounded border-gray-300 text-[#006AE0] focus:ring-[#006AE0]"
                            checked={checked}
                            disabled={limitReached || submitting}
                            onChange={() => toggleBranch(b.code)}
                          />
                          <span className="text-sm text-slate-700">
                            {b.name}{" "}
                            {b.code ? `(${b.code})` : ""}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {needsZone(form.role) && (
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wide">
                    Zone <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.zone_id}
                    onChange={(e) => handleFormChange("zone_id", e.target.value)}
                    className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#006AE0] bg-white"
                  >
                    <option value="">— None —</option>
                    {zoneOptions.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={resetForm}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: "#006AE0" }}
              >
                {submitting ? <Loader size={18} weight={26} inherit label="Saving user" /> : <Save className="w-4 h-4" />}
                {editingId ? "Save Changes" : "Create User"}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">Team Members ({users.length})</h2>
            <button
              onClick={loadAll}
              className="text-xs text-[#006AE0] font-medium hover:underline"
            >
              Refresh
            </button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader size={64} weight={8} />
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              No profiles yet. Seed your admin profile via the migration SQL, then assign more profiles above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-5 py-2.5 font-medium">Name</th>
                    <th className="text-left px-5 py-2.5 font-medium">Email</th>
                    <th className="text-left px-5 py-2.5 font-medium">Role</th>
                    <th className="text-left px-5 py-2.5 font-medium">Scope</th>
                    <th className="text-left px-5 py-2.5 font-medium">Status</th>
                    <th className="px-5 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const badge = roleBadge(u.role);
                    const BadgeIcon = badge.Icon;
                    const isSelf = u.id === user?.id;
                    const assignedBranches = (u.branches || []).length > 0
                      ? u.branches
                      : u.branch
                        ? [u.branch]
                        : [];
                    const branchNames = assignedBranches
                      .map((value) => branchLabel(value))
                      .filter(Boolean);
                    // `profiles.zone` holds the zone NAME ("HS MILANO ZONE 1");
                    // the uuid lookup covers rows written before the parity fix.
                    const zoneName =
                      u.zone || zones.find((z) => z.id === u.zone_id)?.name || null;
                    return (
                      <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                        <td className="px-5 py-3">
                          <div className="font-medium text-slate-800">
                            {u.full_name || <span className="text-slate-400 italic">—</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-600">{u.email || "—"}</td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full text-xs font-semibold px-2.5 py-0.5 ${badge.color}`}
                          >
                            <BadgeIcon className="w-3 h-3" /> {badge.text}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {branchNames.length > 0 ? (
                              branchNames.map((bn, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 rounded-full bg-[#e6f0ff] text-[#006AE0] text-[11px] font-semibold px-2 py-0.5"
                                >
                                  <Building2 className="w-3 h-3" /> {bn}
                                </span>
                              ))
                            ) : needsZone(u.role) ? null : (
                              <span className="text-[11px] text-slate-400 italic">—</span>
                            )}
                            {zoneName && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#fff4e0] text-[#a95f00] text-[11px] font-semibold px-2 py-0.5">
                                <MapPin className="w-3 h-3" /> {zoneName}
                              </span>
                            )}
                            {!zoneName && !branchNames.length && needsZone(u.role) && (
                              <span className="text-[11px] text-slate-400 italic">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          {u.is_disabled ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                              <Ban className="w-3 h-3" /> Disabled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => openEdit(u)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#006AE0] hover:underline mr-3"
                          >
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                          {!isSelf && (
                            <button
                              onClick={() => toggleDisable(u)}
                              disabled={submitting}
                              className={`inline-flex items-center gap-1 text-xs font-medium hover:underline ${
                                u.is_disabled ? "text-emerald-600" : "text-red-500"
                              }`}
                            >
                              {u.is_disabled ? (
                                <><CheckCircle2 className="w-3 h-3" /> Enable</>
                              ) : (
                                <><Ban className="w-3 h-3" /> Disable</>
                              )}
                            </button>
                          )}
                          {!isSelf && (
                            <button
                              onClick={() => deleteUser(u)}
                              disabled={submitting}
                              className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:underline disabled:opacity-50"
                            >
                              <Trash2 className="w-3 h-3" /> Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
