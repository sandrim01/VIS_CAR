/**
 * Core Scoring Engine for Vehicle Inspection System
 * Logic:
 * A. Weights: Structure 40, Safety 25, Mechanics 20, Aesthetics 10, Interior 5 (Total 100)
 * B. Hard Rules:
 *    - REPROVADO (Score 0): Remanche on chassis, engine mismatch, weld in column/longarina.
 *    - MAX 2 STARS: If any Safety item is REPROVED.
 */

export const CATEGORIES = {
    ESTRUTURA: { name: 'Estrutura e Chassi', weight: 40 },
    SEGURANÇA: { name: 'Segurança e Itens Obrigatórios', weight: 25 },
    MECÂNICA: { name: 'Mecânica e Elétrica', weight: 20 },
    ESTÉTICA: { name: 'Estética e Conservação', weight: 10 },
    INTERIOR: { name: 'Interior e Higiene', weight: 5 }
};

export const calculateScore = (checks) => {
    let finalScore = 0;
    let isReprovedHard = false;
    let safetyFailure = false;

    // 1. Process Hard Rules (Nota 0)
    const structuralCheck = checks['ESTRUTURA'] || {};
    if (
        structuralCheck.remanche ||
        structuralCheck.corteSolda ||
        checks['MECÂNICA']?.motorTrocadoSemCadastro
    ) {
        isReprovedHard = true;
    }

    // 2. Compute Weighted Score
    for (const [key, category] of Object.entries(CATEGORIES)) {
        const status = checks[key]?.status || 'CLEAR'; // CLEAR/WARNING/FAIL

        // If FAIL in SEGURANÇA, set safetyFailure flag
        if (key === 'SEGURANÇA' && status === 'FAIL') {
            safetyFailure = true;
        }

        // Multiply status multiplier (1, 0.5, 0) by weight
        let multiplier = 1;
        if (status === 'WARNING') multiplier = 0.5;
        if (status === 'FAIL') multiplier = 0;

        finalScore += category.weight * multiplier;
    }

    // Final Overrides
    if (isReprovedHard) {
        return { score: 0, stars: 0, status: 'REPROVADO', reason: 'Danos estruturais graves detectados' };
    }

    // Calculate Stars (1-5 range)
    let stars = Math.round((finalScore / 100) * 5);

    // Apply safety cap (Max 2 stars if safety failure)
    if (safetyFailure && stars > 2) {
        stars = 2;
    }

    let finalStatus = 'APROVADO';
    if (stars <= 2) finalStatus = 'REPROVADO';
    else if (stars <= 4) finalStatus = 'APROVADO COM APONTAMENTO';

    return {
        score: Math.round(finalScore),
        stars: stars,
        status: finalStatus
    };
};

export const generateHash = async (data) => {
    const msgUint8 = new TextEncoder().encode(JSON.stringify(data));
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const formatUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};
