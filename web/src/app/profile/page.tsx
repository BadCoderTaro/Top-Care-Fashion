"use client";
import { useEffect, useState } from "react";
import { Gender, useAuth } from "@/components/AuthContext";

export default function ProfilePage() {
  const { user, isAuthenticated, updateProfile, changePassword } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [status, setStatus] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setEmail(user.email || "");
      setDob(user.dob || "");
      setGender(user.gender || "");
    }
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Saving...");
    try {
      await updateProfile({ username, email, dob, gender: gender || undefined });
      setStatus("已保存");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Save failed";
      setStatus(message);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordStatus("Passwords do not match.");
      return;
    }
    setChangingPassword(true);
    setPasswordStatus("Updating password...");
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordStatus("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to change password";
      setPasswordStatus(message);
    } finally {
      setChangingPassword(false);
    }
  }

  if (!isAuthenticated) return <p>Please sign in first.</p>;

  return (
    <section className="max-w-md">
      <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
      <form onSubmit={handleSave} className="mt-8 flex flex-col gap-4">
        <label className="text-sm">Username
          <input className="mt-1 w-full border border-black/10 rounded-md px-3 py-2" value={username} onChange={(e)=>setUsername(e.target.value)} required />
        </label>
        <label className="text-sm">Email
          <input type="email" className="mt-1 w-full border border-black/10 rounded-md px-3 py-2" value={email} onChange={(e)=>setEmail(e.target.value)} required />
        </label>
        <label className="text-sm">Date of Birth
          <input type="date" className="mt-1 w-full border border-black/10 rounded-md px-3 py-2" value={dob} onChange={(e)=>setDob(e.target.value)} />
        </label>
        <label className="text-sm">Gender
          <select className="mt-1 w-full border border-black/10 rounded-md px-3 py-2" value={gender || ""} onChange={(e)=>setGender(e.target.value ? (e.target.value as Gender) : "")}>
            <option value="">Not set</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </label>
        <button type="submit" className="inline-flex items-center rounded-md bg-[var(--brand-color)] text-white px-4 py-2 text-sm hover:opacity-90">Save</button>
      </form>
      {status && <p className="mt-4 text-sm">{status}</p>}

      <hr className="my-8 border-black/10" />

      <h2 className="text-xl font-semibold">Change password</h2>
      <form onSubmit={handlePasswordChange} className="mt-4 flex flex-col gap-4">
        <label className="text-sm">Current password
          <input
            type="password"
            className="mt-1 w-full border border-black/10 rounded-md px-3 py-2"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </label>
        <label className="text-sm">New password
          <input
            type="password"
            className="mt-1 w-full border border-black/10 rounded-md px-3 py-2"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        <label className="text-sm">Confirm new password
          <input
            type="password"
            className="mt-1 w-full border border-black/10 rounded-md px-3 py-2"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        <button
          type="submit"
          className="inline-flex items-center rounded-md bg-[var(--brand-color)] text-white px-4 py-2 text-sm hover:opacity-90 disabled:opacity-60"
          disabled={changingPassword}
        >
          {changingPassword ? "Updating..." : "Update password"}
        </button>
      </form>
      {passwordStatus && <p className="mt-4 text-sm">{passwordStatus}</p>}
    </section>
  );
}
