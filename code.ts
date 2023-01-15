figma.skipInvisibleInstanceChildren = true

function format(num: number) {
    var numParts = num.toString().split(".");
    if (numParts.length === 1) {
        numParts.push('00')
    }
    numParts[0] = numParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return numParts.join(".");
}


async function run() {
    let frame: FrameNode | InstanceNode | null = null

    for (const node of figma.currentPage.selection) {
        let el: BaseNode = node
        while (el !== null) {
            if (el.type === "FRAME" || el.type === 'INSTANCE') {
                frame = el
            }
            el = el.parent
        }
    }

    if (frame) {
        let invoiceTotalNode = frame.findOne(node => {
            return node.name === 'Total Amount'
        })
        let invoiceTotal = 0

        let list = frame.findOne(node => {
            return node.name === 'Invoice Items'
        })

        if (list) {
            await Promise.all(Array.from(list.children).map(async (item) => {
                let qty = Number(item.children[1].characters)
                let amountNode = item.children[2]
                let amount = Number(amountNode.characters.replace(/,/g, ''))
                let total = qty * amount

                // sum invoice total
                invoiceTotal += total

                // reformat amount
                await Promise.all(
                    amountNode.getRangeAllFontNames(0, amountNode.characters.length)
                        .map(figma.loadFontAsync)
                )
                if (amountNode.characters !== format(amount)) {
                    amountNode.characters = format(amount)
                }

                // calculate and format total
                let totalNode = item.children[3]
                await Promise.all(
                    totalNode.getRangeAllFontNames(0, totalNode.characters.length)
                        .map(figma.loadFontAsync)
                )
                totalNode.characters = format(total)
            }))
        }

        if (invoiceTotalNode) {
            await Promise.all(
                invoiceTotalNode.getRangeAllFontNames(0, invoiceTotalNode.characters.length)
                    .map(figma.loadFontAsync)
            )

            invoiceTotal = Number(invoiceTotal.toFixed(2))
            invoiceTotalNode.characters = format(invoiceTotal)
        }
    }
}

// TODO
function listen() {
    let shouldRun = false

    figma.on("documentchange", (event) => {
        for (const change of event.documentChanges) {
            switch (change.type) {
                case "PROPERTY_CHANGE":
                    if (change.origin === 'LOCAL' && Array.from(change.properties).includes('characters') && change.node.name === 'Price') {
                        console.log(change.node)
                        shouldRun = true

                    }
                    break;
            }
        }
    });

    figma.on('selectionchange', (event) => {
        if (shouldRun) {
            run()
            shouldRun = false
        }
    })
}

run()
    .then(() => {
        figma.closePlugin()
    })