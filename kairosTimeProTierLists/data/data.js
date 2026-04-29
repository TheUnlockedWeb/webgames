function isLiveServer()
{
    return location.hostname === "127.0.0.1" || location.hostname === "localhost";
}

export const LINK = isLiveServer() ? "http://127.0.0.1:5500/" : "https://monstyrslayr.github.io/kairosTimeProTierLists/";

const IMG_LINK = LINK + "img/";
const NEUTRAL_PIN_END = "_pin.png";

export const UP_ARROW = IMG_LINK + "up_arrow.webp";
export const DOWN_ARROW = IMG_LINK + "down_arrow.webp";
export const NEW_ARROW = IMG_LINK + "new_arrow.webp";
export const UNRELEASED_ARROW = IMG_LINK + "unreleased_arrow.webp";
export const STAR_POWER_2_ARROW = IMG_LINK + "star_power_2_arrow.png";
export const GADGET_1_ARROW = IMG_LINK + "gadget_1_arrow.png";
export const GADGET_2_ARROW = IMG_LINK + "gadget_2_arrow.png";
export const HYPERCHARGE_ARROW = IMG_LINK + "hypercharge_arrow.png";
export const BUFFIE_ARROW = IMG_LINK + "buffie_arrow.png";

const TIER_LIST_LINK = LINK + "tierList/";

const TIER_DATA_CSV = LINK + "data/tierData.csv";
const BRAWLER_DATA_CSV = LINK + "data/brawlerData.csv";

const BRAWLER_LINK = LINK + "brawler/";

const preRanks = ["S", "A", "B", "C", "F"];
const rankCutoff = 29;
const postRanks = ["S", "A", "B", "C", "D", "F"];

// TODO: EASING
export function rankToNum(rank)
{
    if (rank == "S") return 5;
    if (rank == "A") return 4;
    if (rank == "B") return 3;
    if (rank == "C") return 2;
    if (rank == "D") return 1;
    return 0;
}

export function numToRank(num)
{
    if (num >= 4.5) return "S";
    if (num >= 3.5) return "A";
    if (num >= 2.5) return "B";
    if (num >= 1.5) return "C";
    if (num >= 0.5) return "D";
    return "F";
}

export class TierList
{
    version; // 1 indexed
    youtubeId;
    date;
    notes;
    tiers;
    pros;

    constructor(version, youtubeId, date, notes, pros)
    {
        this.version = version;
        this.youtubeId = youtubeId;
        this.date = date;
        this.notes = notes.split('\n');
        this.tiers = [];
        this.pros = pros;
    }

    addTier(newTier)
    {
        for (let i = 0; i < this.tiers.length; i++)
        {
            const tier = this.tiers[i];
            if (tier.letter == newTier.letter)
            {
                this.tiers[i] = newTier;
                return;
            }
        }

        this.tiers.push(newTier);
    }

    hasTier(tierLetter)
    {
        return this.tiers.some(t => t.letter == tierLetter);
    }

    addBrawlerToTier(brawler, tierLetter)
    {
        const tier = this.tiers.find(t => t.letter == tierLetter);
        tier.addBrawler(brawler);
    }

    getBrawlerTier(brawler)
    {
        for (const tier of this.tiers)
        {
            if ([...tier.brawlers].some(b => b.id == brawler.id))
            {
                return tier.letter;
            }
        }
        return null;
    }
}

export class Tier
{
    letter;
    brawlers;

    constructor(letter)
    {
        this.letter = letter;
        this.brawlers = new Set();
    }

    addBrawler(newBrawler)
    {
        this.brawlers.add(newBrawler);
    }
}

export class Brawler
{
    name;
    id;
    neutral;

    constructor(name, release, starPower1, starPower2, gadget1, gadget2, hypercharge, buffies)
    {
        this.name = name;
        this.id = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        this.neutral = IMG_LINK + this.id + NEUTRAL_PIN_END;

        this.release = release == "" ? null : new Date(release);
        this.starPower1 = starPower1 == "" ? null : new Date(starPower1);
        this.starPower2 = starPower2 == "" ? null : new Date(starPower2);
        this.gadget1 = gadget1 == "" ? null : new Date(gadget1);
        this.gadget2 = gadget2 == "" ? null : new Date(gadget2);
        this.hypercharge = hypercharge == "" ? null : new Date(hypercharge);
        this.buffies = buffies == "" ? null : new Date(buffies);
    }
}

export async function getAllBrawlers()
{
    const brawlers = [];

	const brawlerCsv = await fetch(BRAWLER_DATA_CSV);
    if (!brawlerCsv.ok)
	{
		throw new Error("Network response was not ok");
	}
	const brawlerCsvText = await brawlerCsv.text();
	const brawlerResults = await Papa.parse(brawlerCsvText, { header: true });

    for (const line of brawlerResults.data)
    {
        const brawler = new Brawler(line.brawler, line.released, line.star_power_1, line.star_power_2, line.gadget_1, line.gadget_2, line.hypercharge, line.buffies);
        brawlers.push(brawler);
    }

    return brawlers;
}

const brawlers = await getAllBrawlers();

export function getBrawlerById(id)
{
    return brawlers.find(brawler => brawler.id == id);
}

function getBrawlerByName(name)
{
    return brawlers.find(brawler => brawler.name == name);
}

export function addImageToLegend(legend, image, label)
{
    const introDiv = document.createElement("div");
    legend.appendChild(introDiv);

        const legendPin = document.createElement("img");
        legendPin.src = image;
        introDiv.appendChild(legendPin);

        const introText = document.createElement("label");
        introText.textContent = label;
        introDiv.appendChild(introText);
}

export function createBrawlerPin(brawler, rightArrow = null, leftArrow = null)
{
    const daDiv = document.createElement("a");
    daDiv.href = BRAWLER_LINK + brawler.id;
    daDiv.classList.add("pin");

        const brawlerImg = document.createElement("img");
        brawlerImg.src = brawler.neutral;
        brawlerImg.classList.add("pinMain");
        daDiv.appendChild(brawlerImg);

        if (rightArrow != null)
        {
            const arrowImg = document.createElement("img");
            arrowImg.src = rightArrow;
            arrowImg.classList.add("pinArrow");
            arrowImg.classList.add("right");
            daDiv.appendChild(arrowImg);
        }

        if (leftArrow != null)
        {
            const arrowImg = document.createElement("img");
            arrowImg.src = leftArrow;
            arrowImg.classList.add("pinArrow");
            arrowImg.classList.add("left");
            daDiv.appendChild(arrowImg);
        }
    
    return daDiv;
}

export function createBrawlerPercentage(brawler, percentage)
{
    const daButton = document.createElement("a");
    daButton.href = BRAWLER_LINK + brawler.id;
    daButton.classList.add("tierLostButton");

        const brawlerImg = document.createElement("img");
        brawlerImg.src = brawler.neutral;
        brawlerImg.classList.add("pinSide");
        daButton.appendChild(brawlerImg);

        const daLabel = document.createElement("label");
        daLabel.textContent = (percentage * 100).toFixed(2) + "%";
        daButton.appendChild(daLabel);

    return daButton;
}

export function createBrawlerButton(brawler)
{
    const daButton = document.createElement("a");
    daButton.href = BRAWLER_LINK + brawler.id;
    daButton.classList.add("tierListButton");

        const brawlerImg = document.createElement("img");
        brawlerImg.src = brawler.neutral;
        brawlerImg.classList.add("pinSide");
        daButton.appendChild(brawlerImg);

        const daLabel = document.createElement("label");
        daLabel.textContent = brawler.name;
        daButton.appendChild(daLabel);

    return daButton;
}

export async function getAllTierLists()
{
    const tierLists = [];

	const tierCsv = await fetch(TIER_DATA_CSV);
    if (!tierCsv.ok)
	{
		throw new Error("Network response was not ok");
	}
	const tierCsvText = await tierCsv.text();
	const tierResults = await Papa.parse(tierCsvText, { header: true });

    for (const line of tierResults.data)
    {
        if (line.video == "") continue;

        const version = parseInt(line.version);
        const daTierList = new TierList(version, line.video, new Date(line.date), line.notes, line.pros);
        tierLists.push(daTierList);

        const ranks = version >= rankCutoff ? postRanks : preRanks;

        for (const rank of ranks)
        {
            const tier = new Tier(rank);
            daTierList.addTier(tier);
        }
    }

	const brawlerCsv = await fetch(BRAWLER_DATA_CSV);
    if (!brawlerCsv.ok)
	{
		throw new Error("Network response was not ok");
	}
	const brawlerCsvText = await brawlerCsv.text();
	const brawlerResults = await Papa.parse(brawlerCsvText, { header: true });

    for (const line of brawlerResults.data)
    {
        const brawler = getBrawlerByName(line.brawler);

        if (brawler)
        {
            for (const tierList of tierLists)
            {
                const rankString = "rank_" + tierList.version;
                const brawlerRank = line[rankString];

                if (brawlerRank != "")
                {
                    tierList.addBrawlerToTier(brawler, brawlerRank);
                }
            }
        }
    }

    return tierLists;
}

export async function getTierListByVersion(v)
{
    let daList;

	const tierCsv = await fetch(TIER_DATA_CSV);
    if (!tierCsv.ok)
	{
		throw new Error("Network response was not ok");
	}
	const tierCsvText = await tierCsv.text();
	const tierResults = await Papa.parse(tierCsvText, { header: true });

    for (const line of tierResults.data)
    {
        if (line.video == "") continue;

        const version = parseInt(line.version);
        if (v != version) continue;

        daList = new TierList(version, line.video, new Date(line.date), line.notes, line.pros);

        const ranks = version >= rankCutoff ? postRanks : preRanks;

        for (const rank of ranks)
        {
            const tier = new Tier(rank);
            daList.addTier(tier);
        }
    }

    if (daList == null) return null;

	const brawlerCsv = await fetch(BRAWLER_DATA_CSV);
    if (!brawlerCsv.ok)
	{
		throw new Error("Network response was not ok");
	}
	const brawlerCsvText = await brawlerCsv.text();
	const brawlerResults = await Papa.parse(brawlerCsvText, { header: true });

    for (const line of brawlerResults.data)
    {
        const brawler = getBrawlerByName(line.brawler);

        if (brawler)
        {
            const rankString = "rank_" + daList.version;
            const brawlerRank = line[rankString];

            if (brawlerRank != "")
            {
                daList.addBrawlerToTier(brawler, brawlerRank);
            }
        }
    }

    return daList;
}

export function postTierList(div, tierList, previousTierList)
{
    const arrowSet = new Set();

    for (const tier of tierList.tiers)
    {
        if (tier.brawlers.size == 0) continue;
        
        const letterBlock = document.createElement("div");
        letterBlock.classList.add("tierLetterDiv");
        div.appendChild(letterBlock);

            const letterName = document.createElement("h2");
            letterName.textContent = tier.letter;
            letterBlock.appendChild(letterName);

        const brawlerBlock = document.createElement("div");
        brawlerBlock.classList.add("tierBrawlersDiv");
        div.appendChild(brawlerBlock);

        for (const brawler of tier.brawlers)
        {
            let rightArrow = null;
            let leftArrow = null;

            if (previousTierList != null)
            {
                const starPower2Difference = brawler.starPower2 - tierList.date;
                const starPower2DifferencePrev = brawler.starPower2 - previousTierList.date;

                if (starPower2Difference < 0 && starPower2DifferencePrev > 0)
                {
                    leftArrow = STAR_POWER_2_ARROW;
                }

                const gadget1Difference = brawler.gadget1 - tierList.date;
                const gadget1DifferencePrev = brawler.gadget1 - previousTierList.date;

                if (gadget1Difference < 0 && gadget1DifferencePrev > 0)
                {
                    leftArrow = GADGET_1_ARROW;
                }

                const gadget2Difference = brawler.gadget2 - tierList.date;
                const gadget2DifferencePrev = brawler.gadget2 - previousTierList.date;

                if (gadget2Difference < 0 && gadget2DifferencePrev > 0)
                {
                    leftArrow = GADGET_2_ARROW;
                }

                const hyperDifference = brawler.hypercharge - tierList.date;
                const hyperDifferencePrev = brawler.hypercharge - previousTierList.date;

                if (hyperDifference < 0 && hyperDifferencePrev > 0)
                {
                    leftArrow = HYPERCHARGE_ARROW;
                }

                const buffieDifference = brawler.buffies - tierList.date;
                const buffieDifferencePrev = brawler.buffies - previousTierList.date;

                if (buffieDifference < 0 && buffieDifferencePrev > 0)
                {
                    leftArrow = BUFFIE_ARROW;
                }

                const releaseDifference = brawler.release - tierList.date;
                const releaseDifferencePrev = brawler.release - previousTierList.date;

                if (releaseDifference >= 0 || brawler.release == null)
                {
                    leftArrow = UNRELEASED_ARROW;
                }
                else if (releaseDifference < 0 && releaseDifferencePrev > 0)
                {
                    leftArrow = NEW_ARROW;
                }

                const prevRank = previousTierList.getBrawlerTier(brawler);
                if (prevRank != null)
                {
                    const difference = rankToNum(tier.letter) - rankToNum(prevRank);

                    if (difference > 0)
                    {
                        rightArrow = UP_ARROW;
                    }

                    if (difference < 0)
                    {
                        rightArrow = DOWN_ARROW;
                    }
                }
            }
            else
            {
                leftArrow = NEW_ARROW;
            }

            const daPin = createBrawlerPin(brawler, rightArrow, leftArrow);
            arrowSet.add(rightArrow);
            arrowSet.add(leftArrow);
            brawlerBlock.appendChild(daPin);
        }
    }

    return arrowSet;
}

export function createTierListButton(tierList, prevText = "", nextText = "", isFake = false)
{
    const daButton = document.createElement("a");
    if (!isFake) daButton.href = TIER_LIST_LINK + "v" + tierList.version;
    daButton.classList.add("tierListButton");

        const daBg = document.createElement("img");
        daBg.classList.add("tierListBackground");
        daBg.src = `${TIER_LIST_LINK}v${tierList.version}/thumbnail.jpg`;
        daButton.appendChild(daBg);

        const daLabel = document.createElement("label");
        daLabel.textContent = prevText + "v" + tierList.version + nextText;
        daButton.appendChild(daLabel);

    return daButton;
}

export function replaceFooter()
{
    const footer = document.getElementsByTagName("footer")[0];

    const para = document.createElement("p");
    para.innerHTML = `
        This website is not officially associated with KairosTime or KairosTime Gaming in any way.</br>
        Please support the source videos! This website would not be possible without the work of KairosTime and the professional Brawl Stars players.</br>
        This content is not affiliated with, endorsed, sponsored, or specifically approved by Supercell and Supercell is not responsible for it. For more information see Supercell’s Fan Content Policy: <a href="https://www.supercell.com/fan-content-policy" target="_blank">www.supercell.com/fan-content-policy</a></br>
        Report any issues and feedback to <a href="https://discord.com/channels/@me/434840883637125121" target="_blank">@MonstyrSlayr on Discord</a></br>
        <a href="https://github.com/MonstyrSlayr/kairosTimeProTierLists" target="_blank">Source Code</a>
    `;

    footer.innerHTML = "";
    footer.appendChild(para);
}
