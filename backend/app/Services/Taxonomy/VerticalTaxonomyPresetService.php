<?php

namespace App\Services\Taxonomy;

use App\Models\BusinessCategory;
use App\Models\Industry;
use App\Models\Product;
use App\Models\SubIndustry;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class VerticalTaxonomyPresetService
{
    /**
     * Summary list of available vertical taxonomy & product catalog blueprints.
     *
     * @return array<string, mixed>
     */
    public function listPresets(?int $tenantId = null): array
    {
        $definitions = $this->definitions();
        $presets = [];

        foreach ($definitions as $key => $def) {
            $indCount = count($def['industries'] ?? []);
            $subCount = 0;
            $catCount = count($def['universal_categories'] ?? []);

            foreach ($def['industries'] ?? [] as $ind) {
                $subCount += count($ind['sub_industries'] ?? []);
                $catCount += count($ind['business_categories'] ?? []);
            }

            $presets[] = [
                'key' => $key,
                'name' => $def['name'],
                'vertical_label' => $def['vertical_label'],
                'description' => $def['description'],
                'counts' => [
                    'industries' => $indCount,
                    'sub_industries' => $subCount,
                    'business_categories' => $catCount,
                    'products' => count($def['products'] ?? []),
                ],
                'supports_products' => ! empty($def['products']),
            ];
        }

        return [
            'tenant_status' => [
                'tenant_id' => $tenantId,
                'is_isolated' => $tenantId ? (Industry::hasIsolatedTenantTaxonomy($tenantId) || BusinessCategory::hasIsolatedTenantTaxonomy($tenantId)) : false,
                'industries_count' => Industry::forTenantOrDefault($tenantId)->count(),
                'business_categories_count' => BusinessCategory::forTenantOrDefault($tenantId)->count(),
            ],
            'presets' => $presets,
        ];
    }

    /**
     * Provision a vertical taxonomy preset (and optional product catalog) for a specific tenant.
     * Additive & idempotent: never deletes existing leads or master records.
     *
     * @return array<string, int|string|bool>
     */
    public function applyPreset(
        string $presetKey,
        int $tenantId,
        bool $includeProducts = false,
        ?int $userId = null
    ): array {
        $definitions = $this->definitions();
        if (! isset($definitions[$presetKey])) {
            throw new InvalidArgumentException("Unknown taxonomy preset: {$presetKey}");
        }

        if ($tenantId <= 0) {
            throw new InvalidArgumentException('A valid tenant_id is required to apply a vertical preset.');
        }

        $preset = $definitions[$presetKey];

        return DB::transaction(function () use ($presetKey, $preset, $tenantId, $includeProducts, $userId) {
            $industriesSynced = 0;
            $subIndustriesSynced = 0;
            $categoriesSynced = 0;
            $productsSynced = 0;

            foreach ($preset['industries'] ?? [] as $indDef) {
                $industry = Industry::withoutGlobalScopes()->updateOrCreate(
                    [
                        'tenant_id' => $tenantId,
                        'name' => $indDef['name'],
                    ],
                    [
                        'synonyms' => $indDef['synonyms'] ?? null,
                        'scoring_hints' => $indDef['scoring_hints'] ?? null,
                        'is_active' => true,
                    ]
                );
                $industriesSynced++;

                foreach ($indDef['sub_industries'] ?? [] as $subDef) {
                    $subName = is_string($subDef) ? $subDef : $subDef['name'];
                    SubIndustry::withoutGlobalScopes()->updateOrCreate(
                        [
                            'industry_id' => $industry->id,
                            'name' => $subName,
                        ],
                        [
                            'tenant_id' => $tenantId,
                            'synonyms' => is_array($subDef) ? ($subDef['synonyms'] ?? null) : null,
                            'scoring_hints' => is_array($subDef) ? ($subDef['scoring_hints'] ?? null) : null,
                            'is_active' => true,
                        ]
                    );
                    $subIndustriesSynced++;
                }

                foreach ($indDef['business_categories'] ?? [] as $catDef) {
                    BusinessCategory::withoutGlobalScopes()->updateOrCreate(
                        [
                            'tenant_id' => $tenantId,
                            'name' => $catDef['name'],
                        ],
                        [
                            'industry_id' => $industry->id,
                            'code' => $catDef['code'] ?? null,
                            'channel_role' => $catDef['channel_role'] ?? 'direct_b2b',
                            'description' => $catDef['description'] ?? null,
                            'synonyms' => $catDef['synonyms'] ?? null,
                            'scoring_hints' => $catDef['scoring_hints'] ?? null,
                            'is_active' => true,
                        ]
                    );
                    $categoriesSynced++;
                }
            }

            foreach ($preset['universal_categories'] ?? [] as $catDef) {
                BusinessCategory::withoutGlobalScopes()->updateOrCreate(
                    [
                        'tenant_id' => $tenantId,
                        'name' => $catDef['name'],
                    ],
                    [
                        'industry_id' => null,
                        'code' => $catDef['code'] ?? null,
                        'channel_role' => $catDef['channel_role'] ?? 'direct_b2b',
                        'description' => $catDef['description'] ?? null,
                        'synonyms' => $catDef['synonyms'] ?? null,
                        'scoring_hints' => $catDef['scoring_hints'] ?? null,
                        'is_active' => true,
                    ]
                );
                $categoriesSynced++;
            }

            if ($includeProducts && ! empty($preset['products'])) {
                foreach ($preset['products'] as $prodDef) {
                    Product::withoutGlobalScopes()->updateOrCreate(
                        [
                            'tenant_id' => $tenantId,
                            'name' => $prodDef['name'],
                        ],
                        [
                            'category' => $prodDef['category'] ?? null,
                            'website_url' => $prodDef['website_url'] ?? null,
                            'description' => $prodDef['description'] ?? null,
                            'target_industry' => $prodDef['target_industry'] ?? null,
                            'target_pain_points' => $prodDef['target_pain_points'] ?? null,
                            'target_buyer_persona' => $prodDef['target_buyer_persona'] ?? null,
                            'ideal_company_profile' => $prodDef['ideal_company_profile'] ?? null,
                            'ai_reference_material' => $prodDef['ai_reference_material'] ?? null,
                            'use_cases' => $prodDef['use_cases'] ?? [],
                            'keywords' => $prodDef['keywords'] ?? [],
                            'status' => 'active',
                            'created_by' => $userId,
                        ]
                    );
                    $productsSynced++;
                }
            }

            return [
                'preset_key' => $presetKey,
                'preset_name' => $preset['name'],
                'tenant_id' => $tenantId,
                'industries_synced' => $industriesSynced,
                'sub_industries_synced' => $subIndustriesSynced,
                'business_categories_synced' => $categoriesSynced,
                'products_synced' => $productsSynced,
            ];
        });
    }

    /**
     * Built-in generalized vertical definitions.
     *
     * @return array<string, array<string, mixed>>
     */
    private function definitions(): array
    {
        return [
            'wellness_commercial_technogym' => $this->wellnessTechnogymPreset(),
            'b2b_enterprise_technology' => $this->b2bEnterprisePreset(),
        ];
    }

    /**
     * Complete Wellness & Commercial Fitness Matrix (Technogym Global SEGMENT + # LOB + Solution Playbook).
     *
     * @return array<string, mixed>
     */
    private function wellnessTechnogymPreset(): array
    {
        return [
            'name' => 'Wellness, Hospitality & Fitness Solutions (Technogym Matrix)',
            'vertical_label' => 'Wellness & Commercial Equipment',
            'description' => '5 Main Segments (H&R, HCP, CLUBS, HOME, OTHER), 23 Specific Project Sub-Industries, 19 Official Global #LOB Business Categories (100–906), and 9 Core Equipment & Digital Solution Lines.',
            'industries' => [
                [
                    'name' => 'Hospitality & Residential (H&R)',
                    'synonyms' => [
                        'hotel bintang 5',
                        'luxury resort',
                        'apartemen mewah',
                        'developer properti',
                        'hospitality',
                        'wellness spa',
                        'country club',
                        'golf club',
                    ],
                    'scoring_hints' => 'Tamu hotel/resort bintang 4-5, penghuni apartemen/kondominium mewah, developer properti high-end, wellness spa, kapal pesiar, dan golf/yacht/country club yang mengutamakan estetika ruang, prestise merek, dan marketing value properti. Solusi utama: Artis Line, Excite Live, Biostrength, Technogym CheckUp, Visio, MyWellness App.',
                    'sub_industries' => [
                        [
                            'name' => 'Luxury Hotels & Resorts (4 & 5 Star)',
                            'synonyms' => ['hotel bintang 5', 'hotel bintang 4', 'luxury hotel', 'resort mewah', 'jaringan perhotelan'],
                            'scoring_hints' => 'Hotel & resort bintang 4 dan 5 yang menyediakan fasilitas kebugaran & wellness premium bagi tamu VIP dan wisatawan.',
                        ],
                        [
                            'name' => 'Serviced Apartments & Condominiums',
                            'synonyms' => ['apartemen mewah', 'kondominium', 'serviced apartment', 'luxury residence'],
                            'scoring_hints' => 'Apartemen servis & kondominium premium yang membutuhkan fasilitas gym eksklusif bagi penghuni.',
                        ],
                        [
                            'name' => 'High-End Residential Developments',
                            'synonyms' => ['developer properti mewah', 'kawasan hunian mewah', 'township developer', 'properti residensial'],
                            'scoring_hints' => 'Developer properti mewah yang menjadikan clubhouse & wellness facility sebagai daya tarik penjualan unit (marketing value).',
                        ],
                        [
                            'name' => 'Wellness Spa & Retreats',
                            'synonyms' => ['wellness resort', 'luxury spa', 'holistic retreat', 'longevity spa'],
                            'scoring_hints' => 'Fasilitas destinasi spa, longevity retreat, dan pusat relaksasi kebugaran holistik.',
                        ],
                        [
                            'name' => 'Cruise & Marine Vessels',
                            'synonyms' => ['kapal pesiar', 'cruise line', 'ferry', 'superyacht'],
                            'scoring_hints' => 'Kapal pesiar, kapal penumpang komersial, dan yacht dengan area fitness khusus penumpang.',
                        ],
                        [
                            'name' => 'Leisure, Country, Golf & Yacht Clubs',
                            'synonyms' => ['golf club', 'country club', 'yacht club', 'city club', 'klub eksekutif'],
                            'scoring_hints' => 'Country club, lapangan golf, yacht club, dan city club eksklusif berbasis keanggotaan.',
                        ],
                    ],
                    'business_categories' => [
                        [
                            'code' => '205',
                            'name' => 'Hotel & Resorts',
                            'channel_role' => 'direct_b2b',
                            'description' => 'Hotels and resorts (Luxury 4 & 5-star hospitality properties and resort chains).',
                            'synonyms' => ['hotel', 'resort', 'perhotelan', 'hotel bintang 5', 'hospitality group'],
                            'scoring_hints' => 'LOB 205: Fokus pada desain mewah menyatu interior (Artis Line, Excite Live, Biostrength) dan integrasi pengalaman tamu (MyWellness App, Visio).',
                        ],
                        [
                            'code' => '208',
                            'name' => 'Spa',
                            'channel_role' => 'direct_b2b',
                            'description' => 'Wellness SPA and holistic longevity retreats.',
                            'synonyms' => ['wellness spa', 'spa resort', 'medical spa', 'retreat'],
                            'scoring_hints' => 'LOB 208: Fokus pada wellness assessment (Technogym CheckUp), Biostrength, dan alat mindfulness/flexibility.',
                        ],
                        [
                            'code' => '210',
                            'name' => 'Residential',
                            'channel_role' => 'direct_b2b',
                            'description' => 'Fitness areas in private condominiums, serviced apartments, or residential developments.',
                            'synonyms' => ['developer properti', 'kondominium', 'apartemen', 'residential clubhouse', 'real estate developer'],
                            'scoring_hints' => 'LOB 210: Fokus pada nilai jual properti (prestise merek Technogym), durabilitas, estetika ruang, dan kemudahan penggunaan tanpa trainer penuh waktu.',
                        ],
                        [
                            'code' => '211',
                            'name' => 'Cruise',
                            'channel_role' => 'direct_b2b',
                            'description' => 'All Cruise categories (cruise ships, ferry boats, passenger vessels).',
                            'synonyms' => ['kapal pesiar', 'cruise ship', 'pelayaran penumpang', 'marine hospitality'],
                            'scoring_hints' => 'LOB 211: Ketahanan korosi maritim, footprint ruang efisien, dan pengalaman latihan digital bagi penumpang.',
                        ],
                        [
                            'code' => '215',
                            'name' => 'Leisure Club',
                            'channel_role' => 'direct_b2b',
                            'description' => 'Country Club, Golf Club, Yacht Club, and City Club.',
                            'synonyms' => ['golf club', 'country club', 'yacht club', 'city club', 'sports & social club'],
                            'scoring_hints' => 'LOB 215: Member VIP/eksekutif; cocok untuk Artis Line, Biostrength, Skillrun/Skillbike (performa golf), dan Technogym CheckUp.',
                        ],
                    ],
                ],
                [
                    'name' => 'Health, Corporate & Performance (HCP)',
                    'synonyms' => [
                        'rumah sakit',
                        'klinik rehabilitasi',
                        'fisioterapi',
                        'corporate wellness',
                        'kantor pusat',
                        'klub olahraga',
                        'universitas',
                    ],
                    'scoring_hints' => 'Perusahaan korporasi (employee wellness), rumah sakit/klinik rehabilitasi medis & fisioterapi, pusat pelatihan atlet/klub olahraga profesional, universitas/sekolah, dan institusi militer. Solusi utama: Excite Live, Skill Line, Biostrength / REVc (kontrol beban digital klinis), Kinesis One, Technogym CheckUp.',
                    'sub_industries' => [
                        [
                            'name' => 'Corporate Wellness (Corporate HQ)',
                            'synonyms' => ['kantor pusat', 'headquarter', 'perusahaan multinasional', 'gedung perkantoran', 'BUMN', 'employee gym'],
                            'scoring_hints' => 'Kantor pusat korporat nasional/multinasional yang berfokus pada produktivitas, kesehatan, dan employee retention karyawan.',
                        ],
                        [
                            'name' => 'Medical & Rehabilitation Clinics',
                            'synonyms' => ['rumah sakit', 'klinik fisioterapi', 'rehabilitasi medik', 'orthopedic center', 'pusat geriatri', 'klinik kebugaran medis'],
                            'scoring_hints' => 'Rumah sakit, pusat geriatri, ortopedi, sport medicine, dan klinik fisioterapi yang membutuhkan alat rehabilitasi berpresisi klinis.',
                        ],
                        [
                            'name' => 'Sports Performance Centers & Associations',
                            'synonyms' => ['klub sepak bola', 'klub basket', 'KONI', 'pelatnas', 'akademi olahraga', 'federasi olahraga'],
                            'scoring_hints' => 'Pusat pelatihan fisik performa tinggi untuk atlet profesional, klub liga utama, dan asosiasi/federasi olahraga.',
                        ],
                        [
                            'name' => 'Schools & Universities',
                            'synonyms' => ['universitas', 'kampus', 'sekolah internasional', 'boarding school', 'fakultas keolahragaan'],
                            'scoring_hints' => 'Sekolah internasional, kampus/universitas, asrama mahasiswa, dan laboratorium ilmu keolahragaan.',
                        ],
                        [
                            'name' => 'Military & Uniformed Services',
                            'synonyms' => ['militer', 'TNI', 'Polri', 'akademi militer', 'akademi kepolisian', 'pemadam kebakaran'],
                            'scoring_hints' => 'Institusi pertahanan, kepolisian, dan kesatuan berseragam dengan standar kesiapan fisik taktis tinggi.',
                        ],
                    ],
                    'business_categories' => [
                        [
                            'code' => '206',
                            'name' => 'Corporate Clubs',
                            'channel_role' => 'direct_b2b',
                            'description' => 'Companies with a fitness center dedicated to employees.',
                            'synonyms' => ['corporate gym', 'employee wellness', 'kantor pusat perusahaan', 'corporate fitness'],
                            'scoring_hints' => 'LOB 206: Pendekatan ke HRD, General Affairs, & C-Suite untuk program kesehatan karyawan, Technogym CheckUp (wellness age), Excite Live, dan Selection.',
                        ],
                        [
                            'code' => '209',
                            'name' => 'Medical & Health',
                            'channel_role' => 'direct_b2b',
                            'description' => 'Hospitals, Medical Centers, Rehabilitation Centers, and Weight Loss / Longevity Centers.',
                            'synonyms' => ['rumah sakit', 'hospital', 'rehabilitation center', 'klinik fisioterapi', 'sports medicine', 'weight loss clinic'],
                            'scoring_hints' => 'LOB 209: Fokus pada sertifikasi medis & presisi beban klinis (Biostrength / REVc, Kinesis One, Technogym CheckUp). Stakeholder: Direktur Medis, Kepala Rehab Medik, Pengadaan RS.',
                        ],
                        [
                            'code' => '207',
                            'name' => 'Sport & Association',
                            'channel_role' => 'direct_b2b',
                            'description' => 'Professional Sport Clubs and Sport Associations / Federations.',
                            'synonyms' => ['klub olahraga', 'federasi olahraga', 'football club', 'basketball club', 'pusat pelatihan atlet'],
                            'scoring_hints' => 'LOB 207: Fokus pada athletic performance & biomekanika (Skillrun, Skillbike, Skillrow, Pure Strength, Biostrength).',
                        ],
                        [
                            'code' => '202',
                            'name' => 'School & University',
                            'channel_role' => 'direct_b2b',
                            'description' => 'Schools, International Academies, and Universities.',
                            'synonyms' => ['universitas', 'sekolah internasional', 'kampus', 'perguruan tinggi'],
                            'scoring_hints' => 'LOB 202: Fasilitas olahraga kampus/sekolah internasional; membutuhkan durabilitas tinggi, keamanan pengguna muda, dan edukasi olahraga.',
                        ],
                        [
                            'code' => '203',
                            'name' => 'Military & Uniform',
                            'channel_role' => 'direct_b2b',
                            'description' => 'Military, Police, Defense Academies, and Uniformed Services.',
                            'synonyms' => ['militer', 'kepolisian', 'akademi militer', 'instansi pertahanan'],
                            'scoring_hints' => 'LOB 203: Pengadaan institusi pemerintah/pertahanan untuk latihan ketahanan fisik & fungsional berat (Skill Line, Pure Strength, Rigs).',
                        ],
                    ],
                ],
                [
                    'name' => 'Fitness Clubs & Boutiques (CLUBS)',
                    'synonyms' => [
                        'fitness club',
                        'mega gym',
                        'jaringan gym',
                        'boutique fitness studio',
                        'cycling studio',
                        'HIIT studio',
                        'pusat kebugaran',
                    ],
                    'scoring_hints' => 'Bisnis kebugaran komersial (mega gym, jaringan waralaba nasional/global, personal trainer studio) dan boutique studio kelas kelompok (Cycling, HIIT, Rowing) yang mengandalkan keandalan alat high-traffic serta retensi member berbasis digital (MyWellness CRM).',
                    'sub_industries' => [
                        [
                            'name' => 'Commercial Mega Gyms',
                            'synonyms' => ['fitness center komersial', 'mega gym', 'health club besar', 'gym komersial'],
                            'scoring_hints' => 'Fitness club komersial skala besar dengan trafik member harian sangat tinggi.',
                        ],
                        [
                            'name' => 'Franchise Fitness Centers',
                            'synonyms' => ['waralaba gym', 'jaringan fitness nasional', '24 hour gym franchise', 'chain gym'],
                            'scoring_hints' => 'Pusat kebugaran waralaba multi-cabang nasional maupun global.',
                        ],
                        [
                            'name' => 'Boutique Fitness Studios (Cycling, HIIT, Rowing)',
                            'synonyms' => ['boutique studio', 'indoor cycling studio', 'HIIT studio', 'functional studio', 'pay per class studio'],
                            'scoring_hints' => 'Studio butik spesifik (Cycling, HIIT, Running, Rowing) dengan konsep kelas kelompok imersif & pay-per-class.',
                        ],
                        [
                            'name' => 'Public Authority Fitness Facilities',
                            'synonyms' => ['GOR pemerintah', 'pusat olahraga daerah', 'gelanggang olahraga', 'fasilitas kebugaran publik'],
                            'scoring_hints' => 'Fasilitas kebugaran milik/dibiayai pemerintah daerah atau institusi publik.',
                        ],
                        [
                            'name' => 'Personal Trainer Studios',
                            'synonyms' => ['PT studio', 'private training gym', 'semi-private gym'],
                            'scoring_hints' => 'Studio latihan privat/semi-privat yang dioperasikan oleh tim pelatih kebugaran.',
                        ],
                    ],
                    'business_categories' => [
                        [
                            'code' => '200',
                            'name' => 'Private Clubs',
                            'channel_role' => 'direct_b2b',
                            'description' => 'Commercial Fitness Clubs, Franchise Gyms, and Personal Trainer Studios.',
                            'synonyms' => ['fitness club', 'commercial gym', 'waralaba fitness', 'gym chain'],
                            'scoring_hints' => 'LOB 200: Fokus ROI member retention, durabilitas high-traffic harian (Excite Live, Selection, Pure Strength, Universe, MyWellness CRM).',
                        ],
                        [
                            'code' => '204',
                            'name' => 'Public Authorities',
                            'channel_role' => 'direct_b2b',
                            'description' => 'Fitness Clubs owned (or wholly financed) and managed by Public Institutions.',
                            'synonyms' => ['dinas pemuda dan olahraga', 'kemenpora', 'GOR', 'fasilitas olahraga publik'],
                            'scoring_hints' => 'LOB 204: Fasilitas kebugaran milik institusi publik/pemerintah; membutuhkan kepatuhan spesifikasi teknis dan durabilitas jangka panjang.',
                        ],
                        [
                            'code' => '216',
                            'name' => 'Studio',
                            'channel_role' => 'direct_b2b',
                            'description' => 'Boutique studios offering group exercise classes with specialized training experience based on pay-per-class.',
                            'synonyms' => ['boutique studio', 'cycling studio', 'HIIT studio', 'group class studio'],
                            'scoring_hints' => 'LOB 216: Pengalaman latihan kelas kelompok imersif & leaderboard digital (Group Cycle, Skillrun/Skillbike HIIT, Technogym Rigs & Bench, MyWellness).',
                        ],
                    ],
                ],
                [
                    'name' => 'Home & Consumer (HOME)',
                    'synonyms' => [
                        'home gym mewah',
                        'luxury home wellness',
                        'private villa',
                        'penthouse',
                        'HNWI',
                        'luxury lifestyle',
                    ],
                    'scoring_hints' => 'Pemilik rumah pribadi mewah, penthouse, private villa, tokoh publik / High-Net-Worth Individuals (HNWI), dan authorized home reseller yang mengutamakan desain ikonik (Antonio Citterio Personal Line), privasi, dan panduan latihan mandiri (Technogym App & Visio).',
                    'sub_industries' => [
                        [
                            'name' => 'Private Home Gyms (House, Penthouse, Villa)',
                            'synonyms' => ['rumah mewah', 'penthouse', 'private villa', 'home gym pribadi'],
                            'scoring_hints' => 'Ruang kebugaran pribadi di dalam rumah mewah, penthouse, atau private villa.',
                        ],
                        [
                            'name' => 'VIP / High-Net-Worth Individuals (HNWI)',
                            'synonyms' => ['HNWI', 'kolektor mewah', 'eksekutif puncak', 'private client'],
                            'scoring_hints' => 'Klien individu HNWI, komisaris/CEO, dan figur publik yang membeli langsung untuk kediaman pribadi.',
                        ],
                        [
                            'name' => 'Home Wellness Rooms',
                            'synonyms' => ['ruang olahraga rumah', 'compact home gym', 'wellness corner'],
                            'scoring_hints' => 'Ruang wellness kompak terintegrasi di ruang kerja/kamar tidur utama hunian modern.',
                        ],
                        [
                            'name' => 'Authorized Home Equipment Resellers',
                            'synonyms' => ['luxury furniture showroom', 'home wellness dealer', 'retailer alat fitness premium'],
                            'scoring_hints' => 'Mitra showroom furnitur mewah dan reseller resmi lini Home Technogym.',
                        ],
                    ],
                    'business_categories' => [
                        [
                            'code' => '100',
                            'name' => 'Private',
                            'channel_role' => 'direct_b2c',
                            'description' => 'Sales to Private Customers (HNWI / Residential) for Private Use only.',
                            'synonyms' => ['private client', 'home gym', 'HNWI', 'pembeli perorangan', 'private villa'],
                            'scoring_hints' => 'LOB 100 (B2C Private): Klien individu/keluarga HNWI (tidak wajib berbadan hukum PT). Fokus pada estetika desain Antonio Citterio (Personal Line, Kinesis Personal), MY Line, Technogym Bench, dan white-glove interior installation.',
                        ],
                        [
                            'code' => '101',
                            'name' => 'Home Reseller',
                            'channel_role' => 'partner_influencer',
                            'description' => 'Sales to Luxury Home & Lifestyle Resellers / Showrooms.',
                            'synonyms' => ['luxury furniture dealer', 'home reseller', 'lifestyle showroom'],
                            'scoring_hints' => 'LOB 101: Mitra ritel/showroom furnitur & gaya hidup premium yang mendistribusikan produk Home Wellness.',
                        ],
                    ],
                ],
                [
                    'name' => 'Partners, Influencers & Indirect (OTHER)',
                    'synonyms' => [
                        'arsitek',
                        'desainer interior',
                        'architecture firm',
                        'interior design studio',
                        'personal trainer',
                        'perusahaan leasing',
                        'operator fasilitas',
                    ],
                    'scoring_hints' => 'Mitra strategis, pemberi spesifikasi proyek (Architects & Interior Designers, Personal Trainers), perusahaan manajemen fasilitas/kontrak turnkey, serta lembaga pembiayaan/leasing yang membuka peluang proyek di seluruh segmen H&R, HCP, CLUBS, dan HOME.',
                    'sub_industries' => [
                        [
                            'name' => 'Architects & Interior Design Firms',
                            'synonyms' => ['konsultan arsitek', 'biro arsitektur', 'studio desain interior', 'hospitality designer', 'luxury residential architect'],
                            'scoring_hints' => 'Firma arsitektur & desainer interior hotel, apartemen, kantor, dan rumah mewah yang menentukan spesifikasi ruang wellness sejak tahap desain.',
                        ],
                        [
                            'name' => 'Independent Personal Trainers & Coaches',
                            'synonyms' => ['celebrity trainer', 'strength coach', 'konsultan kebugaran', 'fitness influencer'],
                            'scoring_hints' => 'Pelatih kebugaran independen & konsultan olahraga yang merekomendasikan alat kepada klien VIP maupun pemilik studio.',
                        ],
                        [
                            'name' => 'Management & Turnkey Contract Companies',
                            'synonyms' => ['operator gym', 'facility management', 'kontraktor pengadaan', 'hospitality operator'],
                            'scoring_hints' => 'Perusahaan pengelola fasilitas atau kontraktor pengadaan yang membeli atas kontrak proyek.',
                        ],
                        [
                            'name' => 'Leasing Companies & Asset Financing Banks',
                            'synonyms' => ['perusahaan leasing', 'multifinance', 'pembiayaan alat berat & komersial', 'vendor financing'],
                            'scoring_hints' => 'Perusahaan leasing dan perbankan yang membiayai pengadaan alat kebugaran komersial maupun medis.',
                        ],
                    ],
                    'business_categories' => [
                        [
                            'code' => '905',
                            'name' => 'Architects & Interior Designers',
                            'channel_role' => 'partner_influencer',
                            'description' => 'Business Partners and Specifiers / Influencers that generate relevant opportunities across H&R, Corporate, and Luxury Home segments.',
                            'synonyms' => ['arsitek', 'desainer interior', 'architecture studio', 'interior consultant'],
                            'scoring_hints' => 'LOB 905 (Partner/Specifier): Dekati dengan dukungan 3D BIM/CAD wellness space planning, katalog estetika Artis & Personal Line Antonio Citterio, dan kemitraan spesifikasi proyek.',
                        ],
                        [
                            'code' => '906',
                            'name' => 'Personal Trainers',
                            'channel_role' => 'partner_influencer',
                            'description' => 'Business Partners and Fitness Influencers that generate opportunities across Clubs, Studios, and Private Home clients.',
                            'synonyms' => ['personal trainer', 'fitness coach', 'celebrity trainer'],
                            'scoring_hints' => 'LOB 906 (Partner/Influencer): Mitra pelatih yang mempengaruhi pembelian klien HNWI maupun pembukaan boutique studio baru.',
                        ],
                        [
                            'code' => '213',
                            'name' => 'Mgmt Companies & Contracts',
                            'channel_role' => 'indirect_contract',
                            'description' => 'Sales to Management or Contract Companies where final destination spans managed properties/projects.',
                            'synonyms' => ['facility management', 'wellness operator', 'turnkey contractor', 'procurement contractor'],
                            'scoring_hints' => 'LOB 213: Kontraktor turnkey / operator manajemen fasilitas; identifikasi proyek akhir (hotel, apartemen, kantor) saat discovery.',
                        ],
                        [
                            'code' => '902',
                            'name' => 'Leasing Companies',
                            'channel_role' => 'indirect_contract',
                            'description' => 'Sales to Leasing Companies / Banks financing commercial or medical wellness equipment.',
                            'synonyms' => ['perusahaan leasing', 'asset financing', 'corporate leasing', 'bank pembiayaan'],
                            'scoring_hints' => 'LOB 902: Mitra pembiayaan B2B (equipment leasing) untuk membantu gym komersial & rumah sakit mengelola CAPEX ke OPEX.',
                        ],
                    ],
                ],
            ],
            'products' => [
                [
                    'name' => 'Technogym Artis Line (Cardio & Strength)',
                    'category' => 'Flagship Commercial Luxury Line',
                    'website_url' => 'https://www.technogym.com',
                    'description' => 'Lini cardio dan strength flagship berdesain frameless mewah dengan konsol Live layar lebar yang menyatu sempurna dengan interior arsitektural bintang lima.',
                    'target_industry' => 'Hospitality & Residential (H&R), Fitness Clubs & Boutiques (CLUBS)',
                    'target_buyer_persona' => 'General Manager Hotel, Director of Engineering/Rooms, Developer Properti Mewah, Founder Premium Health Club, Arsitek Interior',
                    'target_pain_points' => 'Alat fitness konvensional merusak estetika interior mewah; tamu VIP dan penghuni apartemen premium menuntut fasilitas berstandar hotel bintang 5 global.',
                    'ideal_company_profile' => 'Luxury 5-Star Hotels & Resorts (LOB 205), High-End Condominiums (LOB 210), Leisure/Golf Clubs (LOB 215), dan Flagship Commercial Clubs (LOB 200).',
                    'use_cases' => ['5-Star Hotel Wellness Center', 'Luxury Condominium Clubhouse', 'Executive Country & Golf Club'],
                    'keywords' => ['Artis Cardio', 'Artis Strength', 'Luxury Hotel Gym', 'Frameless Design'],
                ],
                [
                    'name' => 'Technogym Biostrength & REVc',
                    'category' => 'AI Resistance & Medical Rehabilitation',
                    'website_url' => 'https://www.technogym.com',
                    'description' => 'Sistem latihan beban berbasis teknologi aerospace AI Biodrive dengan 6 mode resistensi adaptif dan kontrol presisi klinis untuk rehabilitasi medis, longevity, serta latihan VIP.',
                    'target_industry' => 'Health, Corporate & Performance (HCP), Hospitality & Residential (H&R)',
                    'target_buyer_persona' => 'Direktur Rumah Sakit, Dokter Spesialis Kedokteran Fisik & Rehabilitasi (Sp.KFR), Kepala Fisioterapi, Longevity/Spa Director',
                    'target_pain_points' => 'Kebutuhan kontrol beban eksentrik/isokinetik yang aman dan terukur secara klinis untuk pemulihan pasien pasca-cedera/operasi maupun program anti-aging.',
                    'ideal_company_profile' => 'Rumah Sakit & Klinik Rehabilitasi Medis (LOB 209), Wellness & Longevity Spa (LOB 208), Sports Medicine Center (LOB 207), dan VIP Hotel/Residential.',
                    'use_cases' => ['Clinical Orthopedic & Cardiac Rehab', 'Longevity & Wellness Age Circuit', 'Automated VIP Guided Strength'],
                    'keywords' => ['Biostrength', 'REVc', 'Medical Rehabilitation', 'AI Resistance', 'Longevity'],
                ],
                [
                    'name' => 'Technogym Excite Live',
                    'category' => 'Commercial Connected Cardio',
                    'website_url' => 'https://www.technogym.com',
                    'description' => 'Rangkaian alat kardio komersial generasi terbaru dengan durabilitas tinggi, efisiensi ruang, dan hiburan latihan interaktif Technogym Live.',
                    'target_industry' => 'Fitness Clubs & Boutiques (CLUBS), Hospitality & Residential (H&R), Health, Corporate & Performance (HCP)',
                    'target_buyer_persona' => 'Gym Owner, Operations Manager, Corporate HR/GA Director, Hotel Recreation Manager',
                    'target_pain_points' => 'Tingkat pemakaian harian tinggi membutuhkan reliabilitas mesin maksimal, perawatan mudah, dan konten latihan interaktif agar member betah.',
                    'ideal_company_profile' => 'Commercial Gyms & Franchises (LOB 200), 4-5 Star Hotels (LOB 205), Corporate Employee Gyms (LOB 206), dan University Gyms (LOB 202).',
                    'use_cases' => ['High-Traffic Commercial Cardio Zone', 'Corporate Wellness Center', 'Hotel Fitness Room'],
                    'keywords' => ['Excite Live', 'Commercial Treadmill', 'Synchro', 'Top', 'Climb'],
                ],
                [
                    'name' => 'Technogym Skill Line (Skillrun, Skillbike, Skillrow, Skillmill)',
                    'category' => 'Athletic Performance & HIIT Studio',
                    'website_url' => 'https://www.technogym.com',
                    'description' => 'Lini performa atletik berstandar Olimpiade untuk latihan power, speed, stamina, agility, serta kelas HIIT studio berintensitas tinggi.',
                    'target_industry' => 'Health, Corporate & Performance (HCP), Fitness Clubs & Boutiques (CLUBS)',
                    'target_buyer_persona' => 'Head of Strength & Conditioning, Direktur Klub Olahraga, Founder Boutique HIIT Studio, Komandan Pembinaan Fisik Militer',
                    'target_pain_points' => 'Atlet dan member performance membutuhkan simulasi sled push, parachute run, real gear shift cycling, serta telemetri biofeedback daya/watt akurat.',
                    'ideal_company_profile' => 'Pro Sport Clubs & Federations (LOB 207), Boutique HIIT/Rowing Studios (LOB 216), Military & Uniform (LOB 203), dan Performance Gyms (LOB 200).',
                    'use_cases' => ['Pro Athlete Conditioning Lab', 'SkillX / HIIT Boutique Class', 'Tactical Military Fitness'],
                    'keywords' => ['Skillrun', 'Skillbike', 'Skillrow', 'Skillmill', 'Skilltools', 'HIIT'],
                ],
                [
                    'name' => 'Technogym Pure Strength, Selection & Universe',
                    'category' => 'Commercial Strength & Functional Systems',
                    'website_url' => 'https://www.technogym.com',
                    'description' => 'Kombinasi mesin selectorized ergonomis (Selection), plate-loaded biomekanik murni (Pure Strength), multi-resistance wall (Universe), serta Technogym Rigs.',
                    'target_industry' => 'Fitness Clubs & Boutiques (CLUBS), Health, Corporate & Performance (HCP)',
                    'target_buyer_persona' => 'Commercial Gym Owner, Franchise Expansion Director, Head Coach',
                    'target_pain_points' => 'Kebutuhan zona angkat beban berat yang tahan banting untuk ribuan member serta variasi latihan fungsional di ruang terbatas.',
                    'ideal_company_profile' => 'Commercial Mega Gyms & Franchises (LOB 200), Universities (LOB 202), Public Authorities (LOB 204), dan Sport Associations (LOB 207).',
                    'use_cases' => ['Heavy-Duty Plate-Loaded Strength Zone', 'Selectorized Circuit', 'Functional Rig Arena'],
                    'keywords' => ['Pure Strength', 'Selection 900', 'Technogym Universe', 'Kinesis One', 'Technogym Rigs'],
                ],
                [
                    'name' => 'Technogym Group Cycle',
                    'category' => 'Boutique Indoor Cycling Solution',
                    'website_url' => 'https://www.technogym.com',
                    'description' => 'Ekosistem studio indoor cycling imersif lengkap dengan pelacakan power akurat, visualisasi layar kelas, dan integrasi musik/leaderboard.',
                    'target_industry' => 'Fitness Clubs & Boutiques (CLUBS)',
                    'target_buyer_persona' => 'Boutique Studio Founder, Group Exercise Manager, Health Club Director',
                    'target_pain_points' => 'Menciptakan pengalaman kelas berbayar (pay-per-class) yang energik, kompetitif, dan mendorong repeat booking member.',
                    'ideal_company_profile' => 'Boutique Cycling Studios (LOB 216) dan Full-Service Fitness Clubs (LOB 200).',
                    'use_cases' => ['Pay-per-Class Rhythm & Power Cycling Studio', 'Club Group Exercise Room'],
                    'keywords' => ['Group Cycle', 'Indoor Cycling', 'Spin Studio'],
                ],
                [
                    'name' => 'Technogym Personal Line & Kinesis Personal (Antonio Citterio)',
                    'category' => 'Ultra-Luxury Home & Suite Designer Line',
                    'website_url' => 'https://www.technogym.com',
                    'description' => 'Karya ikonik desainer arsitektur Italia Antonio Citterio (Run Personal, Bike Personal, Cross Personal, Kinesis Personal, Power Personal) yang memadukan seni furnitur mewah dengan teknologi olahraga.',
                    'target_industry' => 'Home & Consumer (HOME), Hospitality & Residential (H&R), Partners, Influencers & Indirect (OTHER)',
                    'target_buyer_persona' => 'HNWI / Private Residence Owner, Luxury Interior Designer & Architect, Presidential Suite Hotel Director',
                    'target_pain_points' => 'Pemilik penthouse/villa mewah dan desainer interior menginginkan alat kebugaran berkelas karya seni yang serasi dengan ruang tamu atau kamar utama.',
                    'ideal_company_profile' => 'Private HNWI Clients (LOB 100), Architects & Interior Designers (LOB 905), Luxury Home Resellers (LOB 101), dan In-Room Presidential Suites (LOB 205).',
                    'use_cases' => ['Penthouse & Private Villa Gym', 'In-Suite Hotel Wellness', 'Designer Living Space'],
                    'keywords' => ['Personal Line', 'Antonio Citterio', 'Run Personal', 'Kinesis Personal', 'Bike Personal', 'Cross Personal'],
                ],
                [
                    'name' => 'Technogym MY Line, UNICA & Technogym Bench',
                    'category' => 'Compact Home Wellness Solutions',
                    'website_url' => 'https://www.technogym.com',
                    'description' => 'Solusi home wellness elegan dan hemat ruang (MyRun, UNICA multi-gym klasik, Technogym Bench & Connected Dumbbells) dengan panduan latihan AI di rumah.',
                    'target_industry' => 'Home & Consumer (HOME)',
                    'target_buyer_persona' => 'Homeowner, Executive Professional, Home Reseller',
                    'target_pain_points' => 'Ingin berolahraga nyaman & privat di rumah dengan ruang kompak namun kualitas biomekanika tetap setara gym profesional.',
                    'ideal_company_profile' => 'Private Home Buyers (LOB 100) dan Authorized Home Resellers (LOB 101).',
                    'use_cases' => ['Home Wellness Room', 'Executive Study Fitness Corner'],
                    'keywords' => ['MyRun', 'UNICA', 'Technogym Bench', 'Connected Dumbbells'],
                ],
                [
                    'name' => 'MyWellness CRM, Technogym CheckUp & Visio',
                    'category' => 'Digital Ecosystem & AI Wellness Assessment',
                    'website_url' => 'https://www.technogym.com',
                    'description' => 'Platform cloud manajemen member & fasilitas (MyWellness CRM), stasiun asesmen AI fisik & kognitif penentu Wellness Age (Technogym CheckUp), serta layar latihan mandiri (Technogym Visio).',
                    'target_industry' => 'Fitness Clubs & Boutiques (CLUBS), Hospitality & Residential (H&R), Health, Corporate & Performance (HCP)',
                    'target_buyer_persona' => 'CEO/Managing Director Gym, Hospital Prevention Head, Corporate Wellness Manager, Hotel Spa Director',
                    'target_pain_points' => 'Kurangnya data objektif progres kesehatan member/pasien/karyawan, retensi member rendah, dan keterbatasan jumlah personal trainer di lokasi.',
                    'ideal_company_profile' => 'Seluruh segmen komersial & institusi (LOB 200, 205, 206, 208, 209, 210, 216).',
                    'use_cases' => ['AI Wellness Age Screening', 'Member Retention & Class Booking CRM', 'Unstaffed Self-Guided Training'],
                    'keywords' => ['MyWellness', 'Technogym CheckUp', 'Technogym Visio', 'Wellness Age', 'Digital Fitness CRM'],
                ],
            ],
        ];
    }

    /**
     * Standard B2B Enterprise, Industrial & Technology taxonomy preset.
     *
     * @return array<string, mixed>
     */
    private function b2bEnterprisePreset(): array
    {
        return [
            'name' => 'B2B Enterprise, Industrial & Technology',
            'vertical_label' => 'General B2B & Enterprise Solutions',
            'description' => '10 Core B2B economic sectors (Manufacturing, IT, Finance, Property, Healthcare, Retail, Logistics, Energy, Education, F&B) and universal commercial business model categories.',
            'industries' => [
                [
                    'name' => 'Manufacturing',
                    'synonyms' => ['manufaktur', 'pabrik', 'kawasan industri'],
                    'sub_industries' => ['Food & Beverage Manufacturing', 'Textile & Apparel', 'Chemical & Plastics', 'Electronics & Components', 'Heavy Equipment'],
                ],
                [
                    'name' => 'Retail & Distribution',
                    'synonyms' => ['ritel', 'distribusi', 'FMCG'],
                    'sub_industries' => ['FMCG / Consumer Goods', 'Wholesale Distribution', 'E-commerce & Marketplace', 'Specialty Retail'],
                ],
                [
                    'name' => 'Technology & IT Services',
                    'synonyms' => ['teknologi informasi', 'software', 'data center', 'telekomunikasi'],
                    'sub_industries' => ['Software Development', 'IT Infrastructure', 'Cybersecurity', 'Cloud Services', 'Data Analytics'],
                ],
                [
                    'name' => 'Finance & Banking',
                    'synonyms' => ['perbankan', 'keuangan', 'asuransi', 'fintech'],
                    'sub_industries' => ['Commercial Banking', 'Insurance', 'Investment & Asset Management', 'Fintech'],
                ],
                [
                    'name' => 'Property & Construction',
                    'synonyms' => ['properti', 'konstruksi', 'real estate', 'developer'],
                    'sub_industries' => ['Residential Development', 'Commercial Real Estate', 'Infrastructure & Civil', 'Interior & Fit-Out'],
                ],
                [
                    'name' => 'Healthcare & Pharmaceuticals',
                    'synonyms' => ['kesehatan', 'rumah sakit', 'farmasi', 'alat kesehatan'],
                    'sub_industries' => ['Hospital & Clinic', 'Pharmaceutical Distribution', 'Medical Devices', 'Health Tech'],
                ],
                [
                    'name' => 'Logistics & Transportation',
                    'synonyms' => ['logistik', 'transportasi', 'pelayaran', 'pergudangan'],
                    'sub_industries' => ['Freight & Forwarding', 'Last-Mile Delivery', 'Warehousing & 3PL', 'Fleet Management'],
                ],
                [
                    'name' => 'Education & Training',
                    'synonyms' => ['pendidikan', 'universitas', 'sekolah', 'pelatihan'],
                    'sub_industries' => ['K-12 Schools', 'Higher Education', 'Vocational Training', 'EdTech'],
                ],
                [
                    'name' => 'Food & Beverage (F&B)',
                    'synonyms' => ['kuliner', 'restoran', 'jaringan F&B'],
                    'sub_industries' => ['Restaurant & Cafe', 'Food Processing', 'Catering & Events', 'Franchise F&B'],
                ],
                [
                    'name' => 'Energy & Utilities',
                    'synonyms' => ['energi', 'pertambangan', 'migas', 'EBT'],
                    'sub_industries' => ['Oil & Gas', 'Renewable Energy', 'Power Generation', 'Water & Waste Management'],
                ],
            ],
            'universal_categories' => [
                ['code' => 'B2B', 'name' => 'Business to Business', 'channel_role' => 'direct_b2b'],
                ['code' => 'B2C', 'name' => 'Business to Consumer', 'channel_role' => 'direct_b2c'],
                ['code' => 'B2G', 'name' => 'Business to Government', 'channel_role' => 'direct_b2b'],
                ['code' => 'Enterprise Group', 'name' => 'Enterprise / Corporate Group', 'channel_role' => 'direct_b2b'],
                ['code' => 'Holding Company', 'name' => 'Holding / Investment Company', 'channel_role' => 'direct_b2b'],
                ['code' => 'Manufacturer', 'name' => 'Manufacturer', 'channel_role' => 'direct_b2b'],
                ['code' => 'Distributor', 'name' => 'Distributor', 'channel_role' => 'partner_influencer'],
                ['code' => 'System Integrator', 'name' => 'System Integrator', 'channel_role' => 'partner_influencer'],
                ['code' => 'Managed Service', 'name' => 'Managed Service Provider', 'channel_role' => 'direct_b2b'],
                ['code' => 'SaaS', 'name' => 'Software as a Service', 'channel_role' => 'direct_b2b'],
                ['code' => 'Contractor', 'name' => 'Contractor / Project-Based Business', 'channel_role' => 'indirect_contract'],
            ],
            'products' => [],
        ];
    }
}

