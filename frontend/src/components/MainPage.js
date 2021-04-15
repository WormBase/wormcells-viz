import React from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route, Link
} from "react-router-dom";
import HeatmapContainer from "./HeatmapContainer";
import RidgeLineContainer from "./RidgeLineContainer";
import SwarmPlot from "./SwarmPlot";
import {Nav} from "react-bootstrap";
import Home from "./Home";
import DotplotContainer from "./DotplotContainer";

const MainPage = () => {
    return (
        <Router>
            <div>
                <Nav>
                    <Nav.Item>
                        <Nav.Link as={Link} to="/">Home</Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link as={Link} to="/heatmap">Heat Map</Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link as={Link} to="/dotplot">Dot Plot</Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link as={Link} to="/ridge_line/default">Ridge line</Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link as={Link} to="/swarm">Swarm plot</Nav.Link>
                    </Nav.Item>
                </Nav>
                <hr/>
                <Switch>
                    <Route path="/heatmap">
                        <HeatmapContainer />
                    </Route>
                    <Route path="/heatmap">
                        <DotplotContainer />
                    </Route>
                    <Route path="/ridge_line/:gene_param" component={RidgeLineContainer} />
                    <Route path="/swarm">
                        <SwarmPlot />
                    </Route>
                    <Route path="/">
                        <Home />
                    </Route>
                </Switch>
            </div>
        </Router>
    );
}

export default MainPage;