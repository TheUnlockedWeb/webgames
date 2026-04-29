import { createBrawlerPercentage, getAllBrawlers, getAllTierLists, numToRank, postTierList, rankToNum, replaceFooter, Tier, TierList } from "../../data/data.js";

replaceFooter();

const brawlers = await getAllBrawlers();
const tierLists = await getAllTierLists();

const normalTiers = ["S", "A", "B", "C", "D", "F"];

const averageList = new TierList(0, "", 0, "", 0);
const lastTenList = new TierList(0, "", 0, "", 0);

for (const tier of normalTiers)
{
    const daHyperTier = new Tier(tier);
    averageList.addTier(daHyperTier);

    const daBuffiesTier = new Tier(tier);
    lastTenList.addTier(daBuffiesTier);
}

for (const brawler of brawlers)
{
    const allRankings = [];

    for (let i = 0; i < tierLists.length; i++)
    {
        const tierList = tierLists[i];
        const tier = tierList.getBrawlerTier(brawler);
        if (tier != null)
        {
            allRankings.push(tier);
        }
    }

    const rankNums = allRankings.map(rank => rankToNum(rank));

    let daTotal = 0;
    rankNums.forEach(num => daTotal += num);
    const daAvg = daTotal / allRankings.length;
    const avgRank = numToRank(daAvg);
    averageList.addBrawlerToTier(brawler, avgRank);

    let totalTen = 0;
    for (let i = Math.max(0, rankNums.length - 10); i < allRankings.length; i++)
    {
        totalTen += rankNums[i];
    }
    const daTen = totalTen / Math.min(rankNums.length, 10);
    const avgTen = numToRank(daTen);
    lastTenList.addBrawlerToTier(brawler, avgTen);
}

const averageListDiv = document.getElementById("avg");
postTierList(averageListDiv, averageList);

const avgTenListDiv = document.getElementById("avg10");
postTierList(avgTenListDiv, lastTenList);
