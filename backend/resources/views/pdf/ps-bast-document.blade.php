<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>{{ $documentTitle }}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1f2937;
            line-height: 1.5;
            font-size: 11px;
            margin: 0;
            padding: 0;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #1e293b;
            padding-bottom: 12px;
            margin-bottom: 20px;
        }
        .header h1 {
            margin: 0;
            color: #0f172a;
            font-size: 18px;
            letter-spacing: 1px;
            text-transform: uppercase;
        }
        .header p {
            margin: 4px 0 0 0;
            color: #475569;
            font-size: 11px;
            font-weight: bold;
        }
        .intro-text {
            text-align: justify;
            margin-bottom: 16px;
            line-height: 1.6;
        }
        .party-block {
            margin-bottom: 16px;
            padding: 10px 14px;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
        }
        .party-block p {
            margin: 3px 0;
        }
        .section-title {
            background-color: #f1f5f9;
            padding: 6px 10px;
            font-weight: bold;
            font-size: 12px;
            margin-top: 18px;
            margin-bottom: 10px;
            border-left: 3px solid #3b82f6;
            text-transform: uppercase;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
        }
        .data-table th, .data-table td {
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            text-align: left;
        }
        .data-table th {
            background-color: #f8fafc;
            font-weight: bold;
            font-size: 10px;
            text-transform: uppercase;
            color: #334155;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .total-row { font-weight: bold; background-color: #f1f5f9; }
        
        .clause-box {
            border: 1px solid #e2e8f0;
            background-color: #fcfcfc;
            padding: 10px 14px;
            margin-top: 14px;
            font-size: 10.5px;
            line-height: 1.6;
            text-align: justify;
        }
        .clause-box ol {
            margin: 4px 0 0 16px;
            padding: 0;
        }
        .clause-box li {
            margin-bottom: 4px;
        }

        .page-break { page-break-after: always; }

        .signature-table {
            width: 100%;
            margin-top: 30px;
            border-collapse: collapse;
        }
        .signature-table td {
            width: 50%;
            vertical-align: top;
            padding: 0 20px;
        }
        .signature-box {
            text-align: center;
        }
        .signature-space {
            height: 70px;
        }
        .signature-name {
            font-weight: bold;
            text-decoration: underline;
        }

        .footer {
            position: fixed;
            bottom: -20px;
            left: 0;
            right: 0;
            height: 25px;
            text-align: center;
            font-size: 9px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
        }
    </style>
</head>
<body>

<div class="header">
    <h1>BERITA ACARA SERAH TERIMA PEKERJAAN (BAST)</h1>
    <p>NOMOR: {{ $documentNumber }}</p>
</div>

<div class="intro-text">
    Pada hari ini, <strong>{{ \Carbon\Carbon::parse($generatedAt)->translatedFormat('l') }}</strong>, tanggal <strong>{{ \Carbon\Carbon::parse($generatedAt)->translatedFormat('d F Y') }}</strong>, bertempat di kantor para pihak, telah dibuat dan ditandatangani Berita Acara Serah Terima Hasil Pekerjaan oleh dan antara:
</div>

<div class="party-block">
    <p><strong>I. PIHAK PERTAMA (PENYEDIA JASA):</strong></p>
    <p>Nama Perusahaan : PT Leadsy Digital Nusantara (Leadsy Inc.)</p>
    <p>Alamat          : Menara Sentraya, Lt. 18, Jl. Iskandarsyah Raya, Jakarta Selatan</p>
    <p>Keterangan      : Bertindak untuk dan atas nama penyedia layanan profesional solusi digital.</p>
</div>

<div class="party-block">
    <p><strong>II. PIHAK KEDUA (PENGGUNA JASA):</strong></p>
    <p>Nama Perusahaan : {{ $lead ? $lead->company_name : 'Customer Organization' }}</p>
    <p>Alamat          : {{ $lead && $lead->address ? $lead->address : 'Sesuai Kontrak Induk Perjanjian' }}</p>
    <p>Keterangan      : Bertindak selaku penerima manfaat langsung dari layanan profesional yang telah diselesaikan.</p>
</div>

<div class="intro-text">
    Dengan ini menerangkan bahwa PIHAK PERTAMA telah menyelesaikan dan menyerahkan seluruh lingkup pekerjaan kepada PIHAK KEDUA, dan PIHAK KEDUA telah memeriksa, menguji (User Acceptance Test), serta menerima dengan baik hasil pekerjaan sebagai berikut:
</div>

<div class="section-title">A. Ringkasan Proyek & Spesifikasi Penyerahan</div>
<table class="data-table">
    <tr>
        <td style="width: 30%; font-weight: bold;">Judul Proyek / Solusi</td>
        <td>{{ $estimation->title }}</td>
    </tr>
    <tr>
        <td style="font-weight: bold;">Referensi Estimasi / Kontrak</td>
        <td>{{ $estimation->estimation_number }}</td>
    </tr>
    <tr>
        <td style="font-weight: bold;">Kategori Layanan</td>
        <td>{{ $estimation->category ? $estimation->category->name : 'Professional Implementation' }}</td>
    </tr>
    <tr>
        <td style="font-weight: bold;">Total Alokasi Waktu (ManDays)</td>
        <td>{{ number_format($estimation->total_mandays, 1) }} ManDays diselesaikan penuh</td>
    </tr>
</table>

<div class="section-title">B. Daftar Deliverable & Hasil Pekerjaan Terverifikasi</div>
<table class="data-table">
    <thead>
        <tr>
            <th style="width: 5%">No</th>
            <th style="width: 35%">Komponen / Modul Pekerjaan</th>
            <th style="width: 45%">Deliverable & Spesifikasi Serah Terima</th>
            <th style="width: 15%" class="text-center">Status</th>
        </tr>
    </thead>
    <tbody>
        @php $idx = 1; @endphp
        @foreach($lines as $task)
            <tr>
                <td class="text-center">{{ $idx++ }}</td>
                <td>
                    <strong>{{ $task->task_name }}</strong>
                    @if($task->description)
                        <div style="font-size: 10px; color: #64748b; margin-top: 2px;">{{ Str::limit($task->description, 100) }}</div>
                    @endif
                </td>
                <td>
                    {{ $task->deliverable ?: 'Dokumentasi & Implementasi Modul Sesuai SOW' }}
                </td>
                <td class="text-center" style="color: #16a34a; font-weight: bold;">
                    LENGKAP (100%)
                </td>
            </tr>
        @endforeach
    </tbody>
</table>

<div class="clause-box">
    <strong>C. KLAUSUL HUKUM PENERIMAAN & GARANSI (WARRANTY):</strong>
    <ol>
        <li>PIHAK KEDUA menyatakan bahwa seluruh deliverable yang tercantum dalam Berita Acara ini telah diuji coba, diverifikasi fungsionalitasnya, dan dinyatakan <strong>DITERIMA DENGAN BAIK TANPA CATATAN (ACCEPTED WITHOUT RESERVATION)</strong>.</li>
        <li>Dengan ditandatanganinya Berita Acara ini, maka hak penagihan (invoicing) dan kewajiban pembayaran tahap akhir/termin serah terima menjadi efektif dan sah secara hukum.</li>
        <li>PIHAK PERTAMA memberikan masa garansi pemeliharaan (Defect Liability Period / Warranty) selama 30 (tiga puluh) hari kalender terhitung sejak tanggal penandatanganan BAST ini untuk perbaikan bug fungsional yang termasuk dalam ruang lingkup awal.</li>
    </ol>
</div>

<table class="signature-table">
    <tr>
        <td>
            <div class="signature-box">
                <p>Yang Menyerahkan,<br><strong>PIHAK PERTAMA</strong><br>PT Leadsy Digital Nusantara</p>
                <div class="signature-space"></div>
                <p class="signature-name">( Project Manager / Executive Leadsy )</p>
                <p style="margin: 0; font-size: 10px; color: #64748b;">Jabatan: Head of Professional Services</p>
            </div>
        </td>
        <td>
            <div class="signature-box">
                <p>Yang Menerima,<br><strong>PIHAK KEDUA</strong><br>{{ $lead ? $lead->company_name : 'Customer Organization' }}</p>
                <div class="signature-space"></div>
                <p class="signature-name">( Authorized Representative )</p>
                <p style="margin: 0; font-size: 10px; color: #64748b;">Jabatan: Project Sponsor / PIC Client</p>
            </div>
        </td>
    </tr>
</table>

<div class="footer">
    Dokumen Resmi Leadsy PSA Engine | Ref: {{ $documentNumber }} | Halaman 1 dari 1
</div>

</body>
</html>
