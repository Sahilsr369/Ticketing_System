/**
 * Prisma Seed — Phase 4
 * Seeds: SLA policies, Super Admin, Demo Technician, 14 categories + subcategories.
 * Run: node prisma/seed.js   (after prisma db push)
 */
require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ─── SLA defaults (minutes) ───────────────────────────────────────────────────
const SLA_POLICIES = [
  { priority: 'CRITICAL', firstResponseMinutes: 15,  resolutionMinutes: 240  },  // 4 hrs
  { priority: 'HIGH',     firstResponseMinutes: 60,  resolutionMinutes: 480  },  // 8 hrs
  { priority: 'MEDIUM',   firstResponseMinutes: 240, resolutionMinutes: 1440 },  // 24 hrs
  { priority: 'LOW',      firstResponseMinutes: 480, resolutionMinutes: 2880 },  // 48 hrs
];

// ─── Category / Subcategory data ──────────────────────────────────────────────
const CATEGORY_DATA = [
  {
    name: 'User Access & Permissions', slug: 'user-access-permissions', sortOrder: 1,
    subcategories: [
      { name: 'New Account Request',   slug: 'new-account-request'   },
      { name: 'Password Reset',        slug: 'password-reset'        },
      { name: 'Account Unlock',        slug: 'account-unlock'        },
      { name: 'Permission Change',     slug: 'permission-change'     },
      { name: 'Shared Mailbox Access', slug: 'shared-mailbox-access' },
      { name: 'Folder / Drive Access', slug: 'folder-drive-access'   },
      { name: 'Application Access',    slug: 'application-access'    },
      { name: 'Access Removal',        slug: 'access-removal'        },
      { name: 'Other',                 slug: 'other'                 },
    ],
  },
  {
    name: 'Identity & Authentication', slug: 'identity-authentication', sortOrder: 2,
    subcategories: [
      { name: 'MFA Setup / Reset',       slug: 'mfa-setup-reset'      },
      { name: 'SSO Issue',               slug: 'sso-issue'            },
      { name: 'Smart Card / Badge',      slug: 'smart-card-badge'     },
      { name: 'Active Directory Issue',  slug: 'active-directory-issue' },
      { name: 'Azure AD / Entra Issue',  slug: 'azure-ad-entra-issue' },
      { name: 'Token / Certificate',     slug: 'token-certificate'    },
      { name: 'Other',                   slug: 'other'                },
    ],
  },
  {
    name: 'New Starters / Leavers / Movers', slug: 'new-starters-leavers-movers', sortOrder: 3,
    subcategories: [
      { name: 'New Starter Setup',         slug: 'new-starter-setup'       },
      { name: 'Leaver Offboarding',        slug: 'leaver-offboarding'      },
      { name: 'Internal Transfer / Mover', slug: 'internal-transfer-mover' },
      { name: 'Equipment Allocation',      slug: 'equipment-allocation'    },
      { name: 'Equipment Return',          slug: 'equipment-return'        },
      { name: 'Role / Department Change',  slug: 'role-department-change'  },
      { name: 'Other',                     slug: 'other'                   },
    ],
  },
  {
    name: 'Email & Microsoft 365', slug: 'email-microsoft-365', sortOrder: 4,
    subcategories: [
      { name: 'Cannot Send Email',    slug: 'cannot-send-email'    },
      { name: 'Cannot Receive Email', slug: 'cannot-receive-email' },
      { name: 'Spam / Phishing',      slug: 'spam-phishing'        },
      { name: 'Email Configuration',  slug: 'email-configuration'  },
      { name: 'Distribution List',    slug: 'distribution-list'    },
      { name: 'OneDrive / SharePoint',slug: 'onedrive-sharepoint'  },
      { name: 'Teams Issue',          slug: 'teams-issue'          },
      { name: 'Outlook / OWA Issue',  slug: 'outlook-owa-issue'    },
      { name: 'Licence Assignment',   slug: 'licence-assignment'   },
      { name: 'Other',                slug: 'other'                },
    ],
  },
  {
    name: 'Hardware & Asset Management', slug: 'hardware-asset-management', sortOrder: 5,
    subcategories: [
      { name: 'Desktop / PC',      slug: 'desktop-pc'       },
      { name: 'Laptop',            slug: 'laptop'           },
      { name: 'Monitor / Display', slug: 'monitor-display'  },
      { name: 'Keyboard / Mouse',  slug: 'keyboard-mouse'   },
      { name: 'Docking Station',   slug: 'docking-station'  },
      { name: 'Mobile Device',     slug: 'mobile-device'    },
      { name: 'Asset Procurement', slug: 'asset-procurement'},
      { name: 'Asset Disposal',    slug: 'asset-disposal'   },
      { name: 'Hardware Fault',    slug: 'hardware-fault'   },
      { name: 'Other',             slug: 'other'            },
    ],
  },
  {
    name: 'Software Installation & Licensing', slug: 'software-installation-licensing', sortOrder: 6,
    subcategories: [
      { name: 'Software Installation',     slug: 'software-installation'    },
      { name: 'Software Uninstallation',   slug: 'software-uninstallation'  },
      { name: 'Licence Request',           slug: 'licence-request'          },
      { name: 'Software Update / Patch',   slug: 'software-update-patch'    },
      { name: 'Application Crash / Error', slug: 'application-crash-error'  },
      { name: 'Antivirus / Endpoint',      slug: 'antivirus-endpoint'       },
      { name: 'Software Configuration',    slug: 'software-configuration'   },
      { name: 'Other',                     slug: 'other'                    },
    ],
  },
  {
    name: 'Network & Connectivity', slug: 'network-connectivity', sortOrder: 7,
    subcategories: [
      { name: 'No Network Connectivity', slug: 'no-network-connectivity' },
      { name: 'Slow Network',            slug: 'slow-network'            },
      { name: 'Wi-Fi Issue',             slug: 'wifi-issue'              },
      { name: 'VPN Issue',               slug: 'vpn-issue'               },
      { name: 'DNS / IP Issue',          slug: 'dns-ip-issue'            },
      { name: 'Firewall / Proxy',        slug: 'firewall-proxy'          },
      { name: 'Network Port / Switch',   slug: 'network-port-switch'     },
      { name: 'Remote Access',           slug: 'remote-access'           },
      { name: 'Other',                   slug: 'other'                   },
    ],
  },
  {
    name: 'Telephony & Communication', slug: 'telephony-communication', sortOrder: 8,
    subcategories: [
      { name: 'No Dial Tone',            slug: 'no-dial-tone'           },
      { name: 'Voicemail Setup / Issue', slug: 'voicemail-setup-issue'  },
      { name: 'Conference Call Issue',   slug: 'conference-call-issue'  },
      { name: 'Handset / Headset Fault', slug: 'handset-headset-fault'  },
      { name: 'Call Diversion',          slug: 'call-diversion'         },
      { name: 'Mobile Phone Issue',      slug: 'mobile-phone-issue'     },
      { name: 'Video Conferencing',      slug: 'video-conferencing'     },
      { name: 'Other',                   slug: 'other'                  },
    ],
  },
  {
    name: 'Printing & Scanning', slug: 'printing-scanning', sortOrder: 9,
    subcategories: [
      { name: 'Cannot Print',           slug: 'cannot-print'          },
      { name: 'Print Quality Issue',    slug: 'print-quality-issue'   },
      { name: 'Printer Offline',        slug: 'printer-offline'       },
      { name: 'Printer Setup',          slug: 'printer-setup'         },
      { name: 'Scanner Issue',          slug: 'scanner-issue'         },
      { name: 'Scan-to-Email Issue',    slug: 'scan-to-email-issue'   },
      { name: 'Consumables (Ink/Paper)',slug: 'consumables'           },
      { name: 'Other',                  slug: 'other'                 },
    ],
  },
  {
    name: 'Meeting Rooms & AV Equipment', slug: 'meeting-rooms-av-equipment', sortOrder: 10,
    subcategories: [
      { name: 'Projector / Screen Issue',  slug: 'projector-screen-issue'  },
      { name: 'Video Call Equipment',      slug: 'video-call-equipment'    },
      { name: 'Audio System Issue',        slug: 'audio-system-issue'      },
      { name: 'Room Booking System',       slug: 'room-booking-system'     },
      { name: 'Display / TV Issue',        slug: 'display-tv-issue'        },
      { name: 'Whiteboard / Interactive',  slug: 'whiteboard-interactive'  },
      { name: 'Other',                     slug: 'other'                   },
    ],
  },
  {
    name: 'Security & Compliance', slug: 'security-compliance', sortOrder: 11,
    subcategories: [
      { name: 'Virus / Malware',              slug: 'virus-malware'               },
      { name: 'Phishing / Social Engineering',slug: 'phishing-social-engineering' },
      { name: 'Suspected Data Breach',        slug: 'suspected-data-breach'       },
      { name: 'Suspicious Activity',          slug: 'suspicious-activity'         },
      { name: 'Data Loss / Leak',             slug: 'data-loss-leak'              },
      { name: 'Compliance Request',           slug: 'compliance-request'          },
      { name: 'Security Audit Support',       slug: 'security-audit-support'      },
      { name: 'Device Encryption',            slug: 'device-encryption'           },
      { name: 'Other',                        slug: 'other'                       },
    ],
  },
  {
    name: 'System Performance & Updates', slug: 'system-performance-updates', sortOrder: 12,
    subcategories: [
      { name: 'Slow Computer',       slug: 'slow-computer'       },
      { name: 'System Crash / BSOD', slug: 'system-crash-bsod'  },
      { name: 'OS Update Issue',     slug: 'os-update-issue'     },
      { name: 'Driver Issue',        slug: 'driver-issue'        },
      { name: 'Disk Space / Storage',slug: 'disk-space-storage'  },
      { name: 'Backup / Recovery',   slug: 'backup-recovery'     },
      { name: 'Server Performance',  slug: 'server-performance'  },
      { name: 'Other',               slug: 'other'               },
    ],
  },
  {
    name: 'Facilities & Infrastructure', slug: 'facilities-infrastructure', sortOrder: 13,
    subcategories: [
      { name: 'Power / UPS Issue', slug: 'power-ups-issue'    },
      { name: 'Cabling / Patching',slug: 'cabling-patching'   },
      { name: 'Server Room Issue', slug: 'server-room-issue'  },
      { name: 'Physical Security', slug: 'physical-security'  },
      { name: 'Environmental (HVAC)', slug: 'environmental-hvac' },
      { name: 'Other',             slug: 'other'              },
    ],
  },
  {
    name: 'Information Requests', slug: 'information-requests', sortOrder: 14,
    subcategories: [
      { name: 'General IT Enquiry',       slug: 'general-it-enquiry'      },
      { name: 'Policy / Procedure Query', slug: 'policy-procedure-query'  },
      { name: 'Training Request',         slug: 'training-request'        },
      { name: 'Documentation Request',    slug: 'documentation-request'   },
      { name: 'Other',                    slug: 'other'                   },
    ],
  },
];

async function main() {
  // ── SLA Policies ──────────────────────────────────────────────────────────
  console.log('Seeding SLA policies…');
  for (const policy of SLA_POLICIES) {
    await prisma.slaPolicy.upsert({
      where:  { priority: policy.priority },
      update: { firstResponseMinutes: policy.firstResponseMinutes, resolutionMinutes: policy.resolutionMinutes },
      create: policy,
    });
    console.log(`  ✓  ${policy.priority}: first response ${policy.firstResponseMinutes}min / resolution ${policy.resolutionMinutes}min`);
  }

  // ── Users ─────────────────────────────────────────────────────────────────
  console.log('\nSeeding users…');
  const adminHash = await bcrypt.hash('Admin@12345', 12);
  const superAdmin = await prisma.user.upsert({
    where:  { email: 'admin@helpdesk.local' },
    update: {},
    create: { firstName: 'System', lastName: 'Administrator', email: 'admin@helpdesk.local', passwordHash: adminHash, role: 'SUPER_ADMIN', active: true },
  });
  console.log(`  ✓  Super Admin: ${superAdmin.email}`);

  const techHash = await bcrypt.hash('Tech@12345', 12);
  const tech = await prisma.user.upsert({
    where:  { email: 'tech@helpdesk.local' },
    update: {},
    create: { firstName: 'Demo', lastName: 'Technician', email: 'tech@helpdesk.local', passwordHash: techHash, role: 'IT_TECHNICIAN', active: true },
  });
  console.log(`  ✓  IT Technician: ${tech.email}`);

  // ── Categories & Subcategories ────────────────────────────────────────────
  console.log('\nSeeding categories and subcategories…');
  for (const cat of CATEGORY_DATA) {
    const category = await prisma.category.upsert({
      where:  { slug: cat.slug },
      update: { name: cat.name, sortOrder: cat.sortOrder },
      create: { name: cat.name, slug: cat.slug, sortOrder: cat.sortOrder, active: true },
    });
    for (let i = 0; i < cat.subcategories.length; i++) {
      const sub = cat.subcategories[i];
      await prisma.subcategory.upsert({
        where:  { categoryId_slug: { categoryId: category.id, slug: sub.slug } },
        update: { name: sub.name, sortOrder: i + 1 },
        create: { categoryId: category.id, name: sub.name, slug: sub.slug, sortOrder: i + 1, active: true },
      });
    }
    console.log(`  ✓  ${category.name} (${cat.subcategories.length} subcategories)`);
  }

  console.log('\nSeed complete.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
