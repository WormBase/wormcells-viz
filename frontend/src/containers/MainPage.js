import React from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route, Link
} from "react-router-dom";
import HeatmapContainer from "./HeatmapContainer";
import RidgeLineContainer from "./RidgeLineContainer";
import SwarmPlotContainer from "./SwarmPlotContainer";
import {Nav} from "react-bootstrap";
import Home from "./Home";

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
                        <Nav.Link as={Link} to="/ridge_line/default">Histogram</Nav.Link>
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
                    <Route path="/ridge_line/:gene_param" component={RidgeLineContainer} />
                    <Route path="/swarm">
                        <SwarmPlotContainer />
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