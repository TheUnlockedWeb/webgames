import { createBrawlerPercentage, getAllBrawlers, getAllTierLists, postTierList, rankToNum, replaceFooter, Tier, TierList } from "../../data/data.js";

replaceFooter();

const tier = "C";

const brawlers = await getAllBrawlers();
const tierLists = await getAllTierLists();

const totalList = new TierList(0, "", 0, "", 0);
const longestList = new TierList(0, "", 0, "", 0);
const totalPerc = new Map();
const longestPerc = new Map();

for (const brawler of brawlers)
{
    let total = 0;
    let longest = 0;
    let current = 0;
    let firstVersion = null;

    for (let i = 0; i < tierLists.length; i++)
    {
        const tierList = tierLists[i];
        const brawlerTier = tierList.getBrawlerTier(brawler);

        if (brawlerTier != null && firstVersion == null)
        {
            firstVersion = i;
        }

        if (brawlerTier == tier)
        {
            total++;
            current++;
        }
        else
        {
            current = 0;
        }
        if (current > longest)
        {
            longest = current;
        }
    }

    if (!totalList.hasTier(total))
    {
        const daTier = new Tier(total);
        totalList.addTier(daTier);
    }

    totalList.addBrawlerToTier(brawler, total);
    totalPerc.set(brawler, total / (tierLists.length - firstVersion));

    if (!longestList.hasTier(longest))
    {
        const daTier = new Tier(longest);
        longestList.addTier(daTier);
    }

    longestList.addBrawlerToTier(brawler, longest);
    longestPerc.set(brawler, longest / (tierLists.length - firstVersion));
}

totalList.tiers.sort((a, b) => b.letter - a.letter);
const totalTierDiv = document.getElementById("totalTierDiv");
postTierList(totalTierDiv, totalList);

const sortedTotalPerc = new Map([...totalPerc].sort(([brawlerA, percA], [brawlerB, percB]) =>
{
    return percB - percA;
}));
const totalPercDiv = document.getElementById("totalPercDiv");
sortedTotalPerc.forEach((perc, brawler) =>
{
    const daDiv = createBrawlerPercentage(brawler, perc);
    totalPercDiv.appendChild(daDiv);
});

longestList.tiers.sort((a, b) => b.letter - a.letter);
const longestTierDiv = document.getElementById("longestTierDiv");
postTierList(longestTierDiv, longestList);

const sortedLongestPerc = new Map([...longestPerc].sort(([brawlerA, percA], [brawlerB, percB]) =>
{
    return percB - percA;
}));
const longestPercDiv = document.getElementById("longestPercDiv");
sortedLongestPerc.forEach((perc, brawler) =>
{
    const daDiv = createBrawlerPercentage(brawler, perc);
    longestPercDiv.appendChild(daDiv);
});
