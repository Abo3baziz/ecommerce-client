import { apiRequest } from "@/lib/api/client";
import type { SystemSettingRecord } from "@/types/admin-settings";

export async function getSystemSettings(section?: string): Promise<SystemSettingRecord | SystemSettingRecord[]> {
  const data = await apiRequest<SystemSettingRecord | SystemSettingRecord[]>({
    url: "/admin/settings",
    params: section ? { section } : undefined,
  });
  return data;
}

export async function getSystemSection(section: string): Promise<SystemSettingRecord> {
  const data = await apiRequest<SystemSettingRecord>({
    url: "/admin/settings",
    params: { section },
  });
  if (Array.isArray(data)) {
    return (data as unknown as SystemSettingRecord[])[0] ?? (data as unknown as SystemSettingRecord);
  }
  return data;
}

export async function updateSystemSection<T>(section: string, payload: T): Promise<SystemSettingRecord> {
  return apiRequest<SystemSettingRecord>({
    url: `/admin/settings/${section}`,
    method: "PATCH",
    data: payload,
  });
}

export async function testEmail(to: string): Promise<{ sent_to: string }> {
  return apiRequest<{ sent_to: string }>({
    url: "/admin/settings/email/test",
    method: "POST",
    data: { to },
  });
}
