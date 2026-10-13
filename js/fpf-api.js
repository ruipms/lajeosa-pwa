// fpf-api.js
async function getCompetitionData(competitionId, seasonId) {
  const base = "https://resultados.fpf.pt/Competition";

  // 1) Jornadas (fixtures)
  const fixturesUrl = `${base}/GetFixtures?competitionId=${competitionId}&seasonId=${seasonId}`;
  const fixturesResp = await fetch(fixturesUrl);
  const fixtures = await fixturesResp.json();

  // 2) Classificação geral
  const classUrl = `${base}/GetClassification?competitionId=${competitionId}&seasonId=${seasonId}`;
  const classResp = await fetch(classUrl);
  const classification = await classResp.json();

  // 3) Detalhes da competição
  const detailsUrl = `${base}/GetCompetitionDetails?competitionId=${competitionId}&seasonId=${seasonId}`;
  const detailsResp = await fetch(detailsUrl);
  const details = await detailsResp.json();

  // 4) Equipas
  const teamsUrl = `${base}/GetTeams?competitionId=${competitionId}`;
  const teamsResp = await fetch(teamsUrl);
  const teams = await teamsResp.json();

  // 5) Jogos + classificação por jornada
  const journeys = [];
  for (const fixture of fixtures) {
    const fixtureId = fixture.fixtureId;
    const url = `${base}/GetClassificationAndMatchesByFixture?fixtureId=${fixtureId}`;
    const resp = await fetch(url);
    const data = await resp.json();

    journeys.push({
      fixtureId,
      jornada: fixture.round,
      matches: data.Matches ?? [],
      classification: data.Classification ?? []
    });
  }

  // 6) Resposta única
  return {
    updated: new Date().toISOString(),
    competitionId,
    seasonId,
    competition: details?.CompetitionName ?? "",
    details,
    teams,
    fixtures,
    journeys,
    classification
  };
}
