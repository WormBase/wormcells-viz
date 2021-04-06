const HeatmapContainer = () => {

    return (
        <div>
            <div className="text-center">
                <br/>
                <h4>Visualization tools for single-cell gene abundance data based on <a href="https://d3js.org/" target="_blank">D3</a></h4>.
                <br/>
                <h5>Heatmaps & dot plots</h5>
                <p>Visualize mean gene expression across select genes & cell types</p><br/>
                <h5>Ridgeline Gene abundance histograms</h5>
                <p>Visualize gene abundances stratified by cell type and experiment</p><br/>
                <h5>Swarm plots</h5>
                <p>Visualize expression of a gene across all cell types relative to one cell type.<br/>These plots are useful for identifying candidate marker genes.</p>
            </div>

        </div>
    );
}

export default HeatmapContainer;