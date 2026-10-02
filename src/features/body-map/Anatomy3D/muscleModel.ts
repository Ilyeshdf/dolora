import * as THREE from 'three';

export interface MuscleInfo {
  id: string;
  name: string;
  latinName: string;
  function: string;
  clinicalSignificance: string;
  group: 'head' | 'chest' | 'core' | 'back' | 'arm' | 'leg';
}

export const MUSCLE_REGISTRY: Record<string, MuscleInfo> = {
  pectoralis_major: {
    id: 'pectoralis_major',
    name: 'Pectoralis Major',
    latinName: 'Musculus pectoralis major',
    function: 'Adduction, internal rotation and flexion of the humerus; respiratory accessory muscle.',
    clinicalSignificance: 'Tension and recruitment elevate significantly during respiratory distress or acute chest/visceral pain.',
    group: 'chest',
  },
  rectus_abdominis: {
    id: 'rectus_abdominis',
    name: 'Rectus Abdominis',
    latinName: 'Musculus rectus abdominis',
    function: 'Flexion of the lumbar spine, compression of abdominal viscera, forced expiration.',
    clinicalSignificance: 'Involuntary guarding / board-like rigidity is a hallmark diagnostic sign of acute peritonitis and severe visceral pain.',
    group: 'core',
  },
  external_oblique: {
    id: 'external_oblique',
    name: 'External Oblique',
    latinName: 'Musculus obliquus externus abdominis',
    function: 'Contralateral torso rotation, lateral trunk flexion, abdominal wall stability.',
    clinicalSignificance: 'Contracts in protective reflexive guarding during abdominal spasms and flank distress.',
    group: 'core',
  },
  serratus_anterior: {
    id: 'serratus_anterior',
    name: 'Serratus Anterior',
    latinName: 'Musculus serratus anterior',
    function: 'Protraction and upward rotation of scapula, elevation of ribs during labored inspiration.',
    clinicalSignificance: 'Hyperactive accessory breathing muscle during hypoxia and dyspnea.',
    group: 'chest',
  },
  deltoid: {
    id: 'deltoid',
    name: 'Deltoid',
    latinName: 'Musculus deltoideus',
    function: 'Primary shoulder abduction; anterior fibers assist flexion and posterior fibers assist extension.',
    clinicalSignificance: 'Site for intramuscular administration and pain motor restlessness.',
    group: 'arm',
  },
  biceps_brachii: {
    id: 'biceps_brachii',
    name: 'Biceps Brachii',
    latinName: 'Musculus biceps brachii',
    function: 'Forearm supination and elbow flexion; secondary glenohumeral stabilization.',
    clinicalSignificance: 'Involuntary arm flexion withdrawal reflex observed in moderate to severe nociceptive pain stimuli.',
    group: 'arm',
  },
  triceps_brachii: {
    id: 'triceps_brachii',
    name: 'Triceps Brachii',
    latinName: 'Musculus triceps brachii',
    function: 'Elbow joint extension; long head adducts and stabilizes the shoulder.',
    clinicalSignificance: 'Reflexive extensor tone during posturing or neuromuscular irritability.',
    group: 'arm',
  },
  forearm_flexors: {
    id: 'forearm_flexors',
    name: 'Forearm Flexor Group',
    latinName: 'Musculi antebrachii',
    function: 'Wrist flexion, finger clenching, hand grasp.',
    clinicalSignificance: 'Fist clenching (Levine sign / fist contraction) is a subconscious motor response to severe acute pain.',
    group: 'arm',
  },
  trapezius: {
    id: 'trapezius',
    name: 'Trapezius',
    latinName: 'Musculus trapezius',
    function: 'Scapular elevation, retraction, depression, and neck extension.',
    clinicalSignificance: 'Tension myalgia and autonomic stress hypertonicity directly manifest in the upper trapezius fibers.',
    group: 'back',
  },
  latissimus_dorsi: {
    id: 'latissimus_dorsi',
    name: 'Latissimus Dorsi',
    latinName: 'Musculus latissimus dorsi',
    function: 'Powerful humerus extension, adduction, and internal rotation; assists deep respiration.',
    clinicalSignificance: 'Tension indicators correlate with sympathetic autonomic tone.',
    group: 'back',
  },
  gluteus_maximus: {
    id: 'gluteus_maximus',
    name: 'Gluteus Maximus',
    latinName: 'Musculus gluteus maximus',
    function: 'Primary hip extension, lateral rotation, pelvic stabilization.',
    clinicalSignificance: 'Crucial for posture; monitored for decubitus pressure risk and bedridden mobility.',
    group: 'back',
  },
  quadriceps: {
    id: 'quadriceps',
    name: 'Quadriceps Femoris',
    latinName: 'Musculus quadriceps femoris',
    function: 'Knee extension (rectus femoris, vastus lateralis, vastus medialis, vastus intermedius).',
    clinicalSignificance: 'Protective leg retraction and clonus monitoring during neurological assessment.',
    group: 'leg',
  },
  gastrocnemius: {
    id: 'gastrocnemius',
    name: 'Gastrocnemius & Calves',
    latinName: 'Musculus gastrocnemius & soleus',
    function: 'Plantar flexion of the foot, knee flexion; venous return muscle pump.',
    clinicalSignificance: 'Essential venous muscle pump; muscle fasciculation and cramping indicate electrolyte imbalance or DVT risk.',
    group: 'leg',
  },
  corrugator_supercilii: {
    id: 'corrugator_supercilii',
    name: 'Corrugator & Facial Expression',
    latinName: 'Musculus corrugator supercilii & procerus',
    function: 'Draws eyebrow inferomedially, creating vertical forehead wrinkles (grimace).',
    clinicalSignificance: 'Key driver of the PSPI (Prkachin and Solomon Pain Intensity) facial action units AU4 (brow lowerer) and AU6/7 (eye squeeze).',
    group: 'head',
  },
  sternocleidomastoid: {
    id: 'sternocleidomastoid',
    name: 'Sternocleidomastoid',
    latinName: 'Musculus sternocleidomastoideus',
    function: 'Unilateral: contralateral head rotation; Bilateral: cervical flexion and sternal elevation.',
    clinicalSignificance: 'Prominent accessory muscle recruitment during severe respiratory distress and airway compromise.',
    group: 'head',
  },
};

/**
 * Builds the complete 3D Anatomical Muscled Human Figure
 */
export function buildMuscledAnatomyModel(
  muscleMaterial: THREE.Material,
  tendonMaterial: THREE.Material,
  accentMaterial: THREE.Material,
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Anatomical_Muscled_Body';

  const attachMeta = (mesh: THREE.Mesh, muscleId: string) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { muscleId, ...MUSCLE_REGISTRY[muscleId] };
  };

  // ==========================================
  // 1. HEAD & NECK
  // ==========================================
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 2.05, 0);

  // Cranium base
  const craniumGeo = new THREE.SphereGeometry(0.34, 32, 24);
  craniumGeo.scale(0.85, 1.05, 0.95);
  const cranium = new THREE.Mesh(craniumGeo, muscleMaterial);
  cranium.position.set(0, 0.12, 0);
  attachMeta(cranium, 'corrugator_supercilii');
  headGroup.add(cranium);

  // Jaw & Mandible
  const jawGeo = new THREE.CylinderGeometry(0.24, 0.16, 0.32, 16);
  jawGeo.scale(0.82, 1, 0.9);
  const jaw = new THREE.Mesh(jawGeo, muscleMaterial);
  jaw.position.set(0, -0.15, 0.08);
  attachMeta(jaw, 'corrugator_supercilii');
  headGroup.add(jaw);

  // Frontalis & Brow ridge (Facial Grimace Pain AU4)
  const browGeo = new THREE.TorusGeometry(0.18, 0.04, 12, 24, Math.PI);
  const brow = new THREE.Mesh(browGeo, accentMaterial);
  brow.position.set(0, 0.12, 0.3);
  brow.rotation.x = Math.PI * 0.1;
  attachMeta(brow, 'corrugator_supercilii');
  headGroup.add(brow);

  // Sternocleidomastoid muscles (L & R neck diagonals)
  const scmGeo = new THREE.CylinderGeometry(0.045, 0.038, 0.42, 16);
  const scmLeft = new THREE.Mesh(scmGeo, muscleMaterial);
  scmLeft.position.set(0.12, -0.32, 0.08);
  scmLeft.rotation.z = -0.28;
  scmLeft.rotation.x = 0.15;
  attachMeta(scmLeft, 'sternocleidomastoid');
  headGroup.add(scmLeft);

  const scmRight = new THREE.Mesh(scmGeo, muscleMaterial);
  scmRight.position.set(-0.12, -0.32, 0.08);
  scmRight.rotation.z = 0.28;
  scmRight.rotation.x = 0.15;
  attachMeta(scmRight, 'sternocleidomastoid');
  headGroup.add(scmRight);

  // Cervical neck core
  const neckCoreGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.38, 20);
  const neckCore = new THREE.Mesh(neckCoreGeo, tendonMaterial);
  neckCore.position.set(0, -0.32, 0);
  headGroup.add(neckCore);

  root.add(headGroup);

  // ==========================================
  // 2. CHEST & THORAX
  // ==========================================
  const chestGroup = new THREE.Group();
  chestGroup.position.set(0, 1.35, 0);

  // Clavicles (collar bones)
  const clavicleGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.85, 16);
  clavicleGeo.rotateZ(Math.PI / 2);
  const clavicle = new THREE.Mesh(clavicleGeo, tendonMaterial);
  clavicle.position.set(0, 0.28, 0.14);
  chestGroup.add(clavicle);

  // Sternum central bone ridge
  const sternumGeo = new THREE.BoxGeometry(0.08, 0.52, 0.04);
  const sternum = new THREE.Mesh(sternumGeo, tendonMaterial);
  sternum.position.set(0, 0.02, 0.28);
  chestGroup.add(sternum);

  // Pectoralis Major - Left & Right (Sternal & Clavicular heads)
  const pecGeo = new THREE.SphereGeometry(0.32, 24, 20);
  pecGeo.scale(1.2, 0.78, 0.65);

  const pecLeft = new THREE.Mesh(pecGeo, muscleMaterial);
  pecLeft.position.set(0.32, 0.12, 0.19);
  pecLeft.rotation.z = -0.16;
  pecLeft.rotation.y = 0.22;
  attachMeta(pecLeft, 'pectoralis_major');
  chestGroup.add(pecLeft);

  const pecRight = new THREE.Mesh(pecGeo, muscleMaterial);
  pecRight.position.set(-0.32, 0.12, 0.19);
  pecRight.rotation.z = 0.16;
  pecRight.rotation.y = -0.22;
  attachMeta(pecRight, 'pectoralis_major');
  chestGroup.add(pecRight);

  // Serratus Anterior (rib slips)
  for (let i = 0; i < 3; i++) {
    const slipGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.22, 12);
    slipGeo.rotateZ(Math.PI / 3);

    const slipL = new THREE.Mesh(slipGeo, muscleMaterial);
    slipL.position.set(0.56 + i * 0.02, -0.1 - i * 0.1, 0.08);
    slipL.rotation.y = 0.4;
    attachMeta(slipL, 'serratus_anterior');
    chestGroup.add(slipL);

    const slipR = new THREE.Mesh(slipGeo, muscleMaterial);
    slipR.position.set(-0.56 - i * 0.02, -0.1 - i * 0.1, 0.08);
    slipR.rotation.y = -0.4;
    attachMeta(slipR, 'serratus_anterior');
    chestGroup.add(slipR);
  }

  root.add(chestGroup);

  // ==========================================
  // 3. ABDOMEN & CORE ("SIX-PACK" & OBLIQUES)
  // ==========================================
  const coreGroup = new THREE.Group();
  coreGroup.position.set(0, 0.85, 0);

  // Linea alba (central abdominal vertical tendinous furrow)
  const lineaAlbaGeo = new THREE.BoxGeometry(0.04, 0.65, 0.03);
  const lineaAlba = new THREE.Mesh(lineaAlbaGeo, tendonMaterial);
  lineaAlba.position.set(0, -0.04, 0.22);
  coreGroup.add(lineaAlba);

  // Rectus Abdominis 6-pack segments (Upper, Mid, Lower)
  const abGeo = new THREE.BoxGeometry(0.19, 0.14, 0.11);
  const abLevels = [
    { y: 0.16, z: 0.21 },
    { y: -0.02, z: 0.21 },
    { y: -0.2, z: 0.19 },
  ];

  abLevels.forEach((lvl, idx) => {
    // Left Ab pack
    const abL = new THREE.Mesh(abGeo, muscleMaterial);
    abL.position.set(0.12, lvl.y, lvl.z);
    abL.rotation.y = 0.1;
    attachMeta(abL, 'rectus_abdominis');
    coreGroup.add(abL);

    // Right Ab pack
    const abR = new THREE.Mesh(abGeo, muscleMaterial);
    abR.position.set(-0.12, lvl.y, lvl.z);
    abR.rotation.y = -0.1;
    attachMeta(abR, 'rectus_abdominis');
    coreGroup.add(abR);

    // Tendinous horizontal intersections
    if (idx < 2) {
      const transGeo = new THREE.BoxGeometry(0.48, 0.025, 0.02);
      const trans = new THREE.Mesh(transGeo, tendonMaterial);
      trans.position.set(0, lvl.y - 0.09, lvl.z + 0.03);
      coreGroup.add(trans);
    }
  });

  // External Obliques (Lateral flank muscles)
  const obliqueGeo = new THREE.CylinderGeometry(0.16, 0.19, 0.54, 16);
  obliqueGeo.scale(0.8, 1, 1.2);

  const obliqueL = new THREE.Mesh(obliqueGeo, muscleMaterial);
  obliqueL.position.set(0.46, -0.08, 0.06);
  obliqueL.rotation.z = -0.12;
  attachMeta(obliqueL, 'external_oblique');
  coreGroup.add(obliqueL);

  const obliqueR = new THREE.Mesh(obliqueGeo, muscleMaterial);
  obliqueR.position.set(-0.46, -0.08, 0.06);
  obliqueR.rotation.z = 0.12;
  attachMeta(obliqueR, 'external_oblique');
  coreGroup.add(obliqueR);

  root.add(coreGroup);

  // ==========================================
  // 4. BACK & POSTERIOR ANATOMY
  // ==========================================
  const backGroup = new THREE.Group();
  backGroup.position.set(0, 1.15, 0);

  // Trapezius (diamond back muscle)
  const trapGeo = new THREE.ConeGeometry(0.58, 0.82, 4);
  trapGeo.scale(1.25, 1, 0.45);
  trapGeo.rotateZ(Math.PI);
  const trap = new THREE.Mesh(trapGeo, muscleMaterial);
  trap.position.set(0, 0.42, -0.12);
  attachMeta(trap, 'trapezius');
  backGroup.add(trap);

  // Latissimus Dorsi (L & R V-Taper Wings)
  const latGeo = new THREE.CylinderGeometry(0.24, 0.14, 0.68, 16);
  latGeo.scale(1.1, 1, 0.6);

  const latL = new THREE.Mesh(latGeo, muscleMaterial);
  latL.position.set(0.42, -0.08, -0.12);
  latL.rotation.z = 0.22;
  attachMeta(latL, 'latissimus_dorsi');
  backGroup.add(latL);

  const latR = new THREE.Mesh(latGeo, muscleMaterial);
  latR.position.set(-0.42, -0.08, -0.12);
  latR.rotation.z = -0.22;
  attachMeta(latR, 'latissimus_dorsi');
  backGroup.add(latR);

  // Erector Spinae (lumbar columns)
  const spineGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.58, 12);
  const erectorL = new THREE.Mesh(spineGeo, muscleMaterial);
  erectorL.position.set(0.11, -0.22, -0.16);
  backGroup.add(erectorL);

  const erectorR = new THREE.Mesh(spineGeo, muscleMaterial);
  erectorR.position.set(-0.11, -0.22, -0.16);
  backGroup.add(erectorR);

  // Gluteus Maximus & Medius (buttocks)
  const gluteGeo = new THREE.SphereGeometry(0.31, 24, 20);
  gluteGeo.scale(0.9, 1.1, 0.95);

  const gluteL = new THREE.Mesh(gluteGeo, muscleMaterial);
  gluteL.position.set(0.26, -0.72, -0.16);
  attachMeta(gluteL, 'gluteus_maximus');
  backGroup.add(gluteL);

  const gluteR = new THREE.Mesh(gluteGeo, muscleMaterial);
  gluteR.position.set(-0.26, -0.72, -0.16);
  attachMeta(gluteR, 'gluteus_maximus');
  backGroup.add(gluteR);

  root.add(backGroup);

  // ==========================================
  // 5. SHOULDERS & ARMS
  // ==========================================
  const buildArm = (isLeft: boolean) => {
    const side = isLeft ? 1 : -1;
    const armGroup = new THREE.Group();
    armGroup.position.set(side * 0.72, 1.48, 0.05);

    // Deltoid (Shoulder Cap)
    const deltGeo = new THREE.SphereGeometry(0.23, 24, 20);
    deltGeo.scale(0.85, 1.25, 0.9);
    const delt = new THREE.Mesh(deltGeo, muscleMaterial);
    delt.position.set(side * 0.08, -0.05, 0);
    attachMeta(delt, 'deltoid');
    armGroup.add(delt);

    // Biceps Brachii (Anterior Upper Arm)
    const bicepGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.38, 16);
    bicepGeo.scale(1, 1, 1.2);
    const bicep = new THREE.Mesh(bicepGeo, muscleMaterial);
    bicep.position.set(side * 0.08, -0.38, 0.06);
    attachMeta(bicep, 'biceps_brachii');
    armGroup.add(bicep);

    // Triceps Brachii (Posterior Upper Arm)
    const tricepGeo = new THREE.CylinderGeometry(0.13, 0.11, 0.42, 16);
    tricepGeo.scale(1.1, 1, 1);
    const tricep = new THREE.Mesh(tricepGeo, muscleMaterial);
    tricep.position.set(side * 0.07, -0.39, -0.07);
    attachMeta(tricep, 'triceps_brachii');
    armGroup.add(tricep);

    // Elbow Joint / Olecranon
    const elbowGeo = new THREE.SphereGeometry(0.09, 16, 16);
    const elbow = new THREE.Mesh(elbowGeo, tendonMaterial);
    elbow.position.set(side * 0.08, -0.62, -0.04);
    armGroup.add(elbow);

    // Forearm & Brachioradialis
    const forearmGeo = new THREE.CylinderGeometry(0.11, 0.075, 0.46, 16);
    forearmGeo.scale(1.15, 1, 0.88);
    const forearm = new THREE.Mesh(forearmGeo, muscleMaterial);
    forearm.position.set(side * 0.12, -0.86, 0.02);
    attachMeta(forearm, 'forearm_flexors');
    armGroup.add(forearm);

    // Clinical Sensor Wristband (Highlighted on Right Arm)
    if (!isLeft) {
      const wristbandGeo = new THREE.TorusGeometry(0.082, 0.022, 12, 24);
      wristbandGeo.rotateX(Math.PI / 2);
      const wristband = new THREE.Mesh(wristbandGeo, accentMaterial);
      wristband.position.set(side * 0.14, -1.11, 0.02);
      wristband.userData = { isSensorSite: true, sensorId: 'ppg_eda' };
      armGroup.add(wristband);
    }

    // Hand & Palm
    const handGeo = new THREE.BoxGeometry(0.06, 0.19, 0.11);
    const hand = new THREE.Mesh(handGeo, tendonMaterial);
    hand.position.set(side * 0.14, -1.22, 0.02);
    armGroup.add(hand);

    return armGroup;
  };

  root.add(buildArm(true)); // Left Arm
  root.add(buildArm(false)); // Right Arm (Sensors attached)

  // ==========================================
  // 6. LEGS & LOWER ANATOMY
  // ==========================================
  const buildLeg = (isLeft: boolean) => {
    const side = isLeft ? 1 : -1;
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.28, 0.35, 0);

    // Quadriceps (Rectus Femoris & Vastus Lateralis/Medialis)
    const quadGeo = new THREE.CylinderGeometry(0.22, 0.14, 0.78, 20);
    quadGeo.scale(1, 1, 1.15);
    const quad = new THREE.Mesh(quadGeo, muscleMaterial);
    quad.position.set(0, -0.38, 0.04);
    attachMeta(quad, 'quadriceps');
    legGroup.add(quad);

    // Vastus Medialis (Teardrop muscle above inside knee)
    const teardropGeo = new THREE.SphereGeometry(0.12, 16, 16);
    teardropGeo.scale(0.8, 1.2, 0.9);
    const teardrop = new THREE.Mesh(teardropGeo, muscleMaterial);
    teardrop.position.set(-side * 0.08, -0.68, 0.1);
    attachMeta(teardrop, 'quadriceps');
    legGroup.add(teardrop);

    // Hamstrings (Back of Thigh)
    const hamGeo = new THREE.CylinderGeometry(0.19, 0.13, 0.72, 16);
    const ham = new THREE.Mesh(hamGeo, muscleMaterial);
    ham.position.set(0, -0.38, -0.08);
    attachMeta(ham, 'quadriceps');
    legGroup.add(ham);

    // Knee / Patella Bone
    const patellaGeo = new THREE.SphereGeometry(0.1, 16, 16);
    patellaGeo.scale(0.9, 1.1, 0.6);
    const patella = new THREE.Mesh(patellaGeo, tendonMaterial);
    patella.position.set(0, -0.84, 0.1);
    legGroup.add(patella);

    // Calves - Gastrocnemius (Medial & Lateral muscle bellies)
    const calfGeo = new THREE.SphereGeometry(0.17, 20, 18);
    calfGeo.scale(0.9, 1.5, 0.95);
    const calf = new THREE.Mesh(calfGeo, muscleMaterial);
    calf.position.set(0, -1.22, -0.06);
    attachMeta(calf, 'gastrocnemius');
    legGroup.add(calf);

    // Tibialis Anterior (Front Shin Muscle)
    const shinGeo = new THREE.CylinderGeometry(0.09, 0.065, 0.68, 16);
    shinGeo.scale(0.7, 1, 1.1);
    const shin = new THREE.Mesh(shinGeo, muscleMaterial);
    shin.position.set(0, -1.28, 0.06);
    attachMeta(shin, 'gastrocnemius');
    legGroup.add(shin);

    // Achilles Tendon
    const achillesGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.38, 12);
    const achilles = new THREE.Mesh(achillesGeo, tendonMaterial);
    achilles.position.set(0, -1.52, -0.07);
    legGroup.add(achilles);

    // Foot & Ankle
    const footGeo = new THREE.BoxGeometry(0.14, 0.1, 0.32);
    const foot = new THREE.Mesh(footGeo, tendonMaterial);
    foot.position.set(0, -1.74, 0.08);
    legGroup.add(foot);

    return legGroup;
  };

  root.add(buildLeg(true)); // Left Leg
  root.add(buildLeg(false)); // Right Leg

  return root;
}
