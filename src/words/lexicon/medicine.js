import { C } from './define.js';

export default [
  C('healers', 'support', 'light', 'heal', 'medical person heal', '✚', 'Mends nearby towers',
    `doctor doctors doc docs medic medics nurse nurses physician physicians surgeon surgeons healer healers
 paramedic paramedics medico clinician clinicians therapist therapists practitioner pharmacist pharmacists
 apothecary apothecaries herbalist herbalists midwife midwives dentist dentists vet vets veterinarian
 optometrist pediatrician paediatrician dermatologist cardiologist anesthetist anaesthetist radiologist
 neurologist oncologist psychiatrist psychologist counselor counsellor caregiver caregivers caretaker
 nursemaid sawbones physio physiotherapist chiropractor osteopath orthopedist obstetrician surgery
 intern internist corpsman healthcare medicare medicaid matron sister orderly orderlies
 chemist druggist  bonesetter infirmarian
 nanny`),
  C('remedies', 'support', 'water', 'heal', 'medical remedy heal', '💊', 'Doses nearby towers with remedies',
    `medicine medicines medication medications medicament remedy remedies cure cures tonic tonics salve salves
 balm balms ointment ointments bandage bandages gauze plaster plasters splint splints stitch stitches suture
 sutures pill pills tablet tablets capsule capsules vaccine vaccines antidote antidotes serum serums syringe
 syringes injection injections dose doses aspirin penicillin antibiotic antibiotics insulin morphine
 vitamin vitamins lotion lotions poultice poultices tincture tinctures lozenge lozenges inhaler inhalers
 stethoscope thermometer crutch crutches wheelchair stretcher stretchers medkit painkiller painkillers
 analgesic anesthetic anaesthetic sedative remedial elixir panacea restorative pharmacy
 prescription prescriptions ibuprofen paracetamol antiseptic disinfectant iodine sling tourniquet
 defibrillator transfusion dialysis therapy therapies treatment treatments checkup vaccination
 immunization inoculation medkit `),
  C('hospital', 'support', 'light', 'heal:1.15', 'medical place heal', '🏥', 'Treats every tower in its wards',
    `hospital hospitals clinic clinics infirmary infirmaries sanatorium sanitarium hospice hospices ward wards
 dispensary sickbay sickroom sickbed surgery ambulance ambulances triage emergency
 convalescence recovery rehab rehabilitation spa spas sanctuary asylum`, { stat: { range: 1.2 } }),
  C('health', 'support', 'nature', 'heal:0.95', 'health life heal', '❤', 'Fills nearby towers with vitality',
    `health wellness vitality vigor vigour stamina fitness wholeness hygiene sanity wellbeing healing life lives
 breath breathing   lifeblood lifeforce strength endurance resilience longevity immunity
 nourishment nutrition diet exercise rest relief comfort solace respite renewal rebirth revival
 resurrection regeneration rejuvenation`, { mass: true }),
];
