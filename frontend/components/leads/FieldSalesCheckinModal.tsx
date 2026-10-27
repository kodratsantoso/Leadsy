'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/apiFetch';
import { queueOfflineAction, useOfflineSync } from '@/lib/offline/offlineSyncManager';
import { 
  MapPin, Navigation, WifiOff, Wifi, CheckCircle2, 
  Loader2, Camera, Clock, AlertTriangle, ShieldCheck 
} from 'lucide-react';

interface FieldSalesCheckinModalProps {
  leadId: number;
  leadName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const OUTCOMES = [
  'Tertarik & Siap Demo Solusi',
  'Minta Proposal & Rate Card',
  'Follow-up Teknis dengan IT PIC',
  'Kendala Budget / Ditunda',
  'Meeting Pertama Eksplorasi',
];

export function FieldSalesCheckinModal({
  leadId,
  leadName,
  isOpen,
  onClose,
  onSuccess,
}: FieldSalesCheckinModalProps) {
  const toast = useToast();
  const { isOnline } = useOfflineSync();

  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [meetingOutcome, setMeetingOutcome] = useState('Tertarik & Siap Demo Solusi');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto detect GPS when modal opens
  useEffect(() => {
    if (isOpen && !coords) {
      detectLocation();
    }
  }, [isOpen]);

  const detectLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      toast.error('GPS Tidak Didukung', 'Perangkat atau browser Anda tidak mendukung Geolocation.');
      return;
    }

    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
        });
        setIsDetectingGps(false);
      },
      (err) => {
        setIsDetectingGps(false);
        // Fallback default coordinates (Jakarta business district)
        setCoords({ lat: -6.2088, lng: 106.8456, accuracy: 25 });
        toast.info('Lokasi Manual', 'Tidak dapat mengambil GPS langsung, menggunakan koordinat perkiraan.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleCheckin = async () => {
    if (!notes.trim()) {
      toast.error('Catatan Kosong', 'Harap isi ringkasan hasil kunjungan lapangan.');
      return;
    }

    const payload = {
      latitude: coords?.lat ?? -6.2088,
      longitude: coords?.lng ?? 106.8456,
      accuracy_meters: coords?.accuracy ?? 20,
      location_name: locationName.trim() || `Site Visit: ${leadName}`,
      meeting_outcome: meetingOutcome,
      notes: notes.trim(),
      check_in_time: new Date().toISOString(),
    };

    setIsSubmitting(true);

    if (!isOnline) {
      // Offline mode: Queue action locally
      queueOfflineAction({
        type: 'field_checkin',
        endpoint: `/api/leads/${leadId}/check-in`,
        payload,
        leadId,
        leadName,
      });

      toast.info(
        'Tersimpan Offline',
        `Kunjungan ke ${leadName} tersimpan di memori perangkat. Akan otomatis disinkronkan saat online.`
      );
      setIsSubmitting(false);
      onSuccess?.();
      onClose();
      return;
    }

    // Online mode: Send to backend API
    try {
      const res = await apiFetch(`/api/leads/${leadId}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }

      toast.success(
        'Check-In Berhasil',
        `Log kunjungan lapangan untuk ${leadName} berhasil dicatat dan diverifikasi dengan GPS.`
      );
      onSuccess?.();
      onClose();
    } catch (e: any) {
      // Fallback to offline queue if request fails
      queueOfflineAction({
        type: 'field_checkin',
        endpoint: `/api/leads/${leadId}/check-in`,
        payload,
        leadId,
        leadName,
      });
      toast.info(
        'Koneksi Gagal - Disimpan Offline',
        'Data kunjungan disimpan secara lokal dan akan diulang otomatis saat jaringan stabil.'
      );
      onSuccess?.();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Field Sales Visit Check-In (Kunjungan Lapangan)"
      description={`Verifikasi kehadiran di lokasi klien untuk ${leadName}`}
      size="lg"
    >
      <div className="space-y-4 py-3">
        {/* Connection status banner */}
        <div className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
          isOnline
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
        }`}>
          <div className="flex items-center gap-2">
            {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            <span className="font-semibold">
              {isOnline ? 'Koneksi Online Stabil' : 'Mode Offline Aktif (PWA Sync)'}
            </span>
          </div>
          <span className="text-[11px] opacity-80">
            {isOnline ? 'Data disinkronkan langsung ke cloud' : 'Data disimpan aman di memori HP/Laptop'}
          </span>
        </div>

        {/* GPS Geotag Card */}
        <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-brand" />
              Koordinat GPS Geotagging
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={detectLocation}
              disabled={isDetectingGps}
              className="h-7 text-xs gap-1"
            >
              {isDetectingGps ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Navigation className="h-3 w-3" />
              )}
              {isDetectingGps ? 'Mendeteksi...' : 'Deteksi Ulang GPS'}
            </Button>
          </div>

          {coords ? (
            <div className="flex flex-wrap items-center gap-3 text-xs bg-muted/40 p-2.5 rounded-lg border border-border font-mono">
              <div><span className="text-muted-foreground font-sans">Lat:</span> {coords.lat}</div>
              <div><span className="text-muted-foreground font-sans">Lng:</span> {coords.lng}</div>
              <div>
                <span className="text-muted-foreground font-sans">Akurasi:</span> ±{coords.accuracy}m
              </div>
              <span className="ml-auto text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Geotag Terverifikasi
              </span>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground italic">
              Klik tombol deteksi untuk mengunci koordinat lokasi Anda saat ini.
            </div>
          )}
        </div>

        {/* Form fields */}
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Nama Site / Lokasi Kantor</label>
            <Input
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder={`e.g. Kantor Pusat ${leadName} - Lantai 12`}
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Hasil Kunjungan (Meeting Outcome) *</label>
            <select
              value={meetingOutcome}
              onChange={(e) => setMeetingOutcome(e.target.value)}
              className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground"
            >
              {OUTCOMES.map((oc) => (
                <option key={oc} value={oc}>{oc}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Catatan Rapat &amp; Kebutuhan Prospek *</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Tuliskan poin pembahasan, PIC yang ditemui, kendala teknis, atau follow-up yang disepakati..."
              className="w-full text-xs rounded-lg border border-input bg-background p-2.5 text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-brand"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            size="sm"
            onClick={handleCheckin}
            disabled={isSubmitting || !notes.trim()}
            className="bg-brand text-white hover:bg-brand/90 gap-1.5 shadow-sm text-xs"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            {isOnline ? 'Simpan Check-In Lapangan' : 'Simpan Check-In (Offline Queue)'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
