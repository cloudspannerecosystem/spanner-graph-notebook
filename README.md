# Spanner Graph Notebook: Explore Your Data Visually


The Spanner Graph Notebook tool lets you visually query [Spanner Graph](https://cloud.google.com/spanner/docs/graph/overview) in a notebook environment (e.g. [Google Colab](https://colab.google/) and [Jupyter Notebook](https://jupyter.org/)). 

Using [GQL](https://cloud.google.com/spanner/docs/reference/standard-sql/graph-intro) query syntax, you can extract graph insights and relationship patterns, including node and edge properties and neighbor expansion analysis. The tool also provides graph schema metadata visualization, tabular results inspection and diverse layout topologies.

The notebook visualization provides a user experience similar to Spanner Studio visualization, enabling you to visually inspect Spanner Graph data outside of Google Cloud console.

<img src="./assets/full_viz.png" width="800"/>

## Table of Contents  
* [Prerequisites](#prerequisites)
* [Google Colab Usage (Installation-Free)](#colab-usage)
* [Installation and Usage in Jupyter Notebook or JupyterLab](#jupyter-usage)
* [Query Requirements](#query-requirements)

<h2 id="prerequisites">
  Prerequisites
</h2>

You need a Spanner database with graph schema and data. The [Getting started with Spanner Graph](https://codelabs.developers.google.com/codelabs/spanner-graph-getting-started#0) codelab or the [Set up and query Spanner Graph](https://cloud.google.com/spanner/docs/graph/set-up) page walks through the setup process.


<h2 id="colab-usage">
  Google Colab Usage (Installation-Free)
</h2>

You can directly use `%%spanner_graph` magic command to visualize graph query results in [Google Colab](https://colab.google/). The magic command must provide GCP resource options and a query string:

 - a Google Cloud [Project ID](https://cloud.google.com/resource-manager/docs/creating-managing-projects) for `--project` option. 
 - a Spanner [Instance ID](https://cloud.google.com/spanner/docs/create-manage-instances) for `--instance` option.
 - a Spanner [database name](https://cloud.google.com/spanner/docs/create-manage-databases) for `--database` option.
 - a [GQL](https://cloud.google.com/spanner/docs/graph/queries-overview) query string that returns graph elements as results.


The query must return [**graph elements in JSON format**](https://cloud.google.com/spanner/docs/graph/queries-overview#return-graph-elements-json) using the `SAFE_TO_JSON` or `TO_JSON` function. The following example code cell in Colab visualizes account transfers:

```sql
%%spanner_graph --project my-gcp-project --instance my-spanner-instance --database my-database

GRAPH FinGraph
MATCH result_paths = (src:Account {is_blocked: true})-[:Transfers]->(dest:Account)
RETURN SAFE_TO_JSON(result_paths) AS result_paths
```

You'll be prompted to authenticate via [`pydata-google-auth`](https://github.com/pydata/pydata-google-auth) if Google Cloud Platform credentials aren't readily available.

<img src="./assets/colab_usage.gif" width="600"/>

<h2 id="jupyter-usage">
  Installation and Usage in Jupyter Notebook or JupyterLab
</h2>

### Install the package

Follow the commands below to create a managed Python environment (example based on [virtualenv](https://virtualenv.pypa.io/en/latest/)) and install [`spanner-graph-notebook`](https://pypi.org/project/spanner-graph-notebook/).

```shell
# Create the virtualenv `viz`.
python3 -m venv viz

# Activate the virtualenv.
source viz/bin/activate

# Install dependencies.
pip install spanner-graph-notebook
```

### Launch Jupyter Notebook

When in the root directory of the package, run `jupyter notebook` or `jupyter lab` to launch your Jupyter notebook environment.

```shell
jupyter notebook
```

As Jupyter local server runs, it will open up a web portal. You can step through an example notebook [`sample.ipynb`](https://github.com/cloudspannerecosystem/spanner-graph-notebook/blob/main/sample.ipynb).

<img src="./assets/sample_jupyter.png" width="600"/>

You must run `%load_ext spanner_graphs` to load this package. `sample.ipynb` contains this cell already.

<img src="./assets/load_ext.png" width="600"/>

Following the code steps in the sample notebook, you can visually inspect a mock dataset or your Spanner Graph. You'll be prompted to authenticate via [`pydata-google-auth`](https://github.com/pydata/pydata-google-auth) if Google Cloud Platform credentials aren't readily available.

<img src="./assets/jupyter.gif" width="600"/>

<h2 id="query-requirements">
  Query Requirements
</h2>

### Use `TO_JSON` function to return graph elements

Graph queries **must use** `SAFE_TO_JSON` or `TO_JSON` function to return [graph elements in JSON format](https://cloud.google.com/spanner/docs/graph/queries-overview#return-graph-elements-json) . We recommend visualizing **graph paths** for data completeness and ease of use.

```sql
👍 Good example returning a path as JSON.


GRAPH FinGraph
MATCH query_path = (person:Person {id: 5})-[owns:Owns]->(accnt:Account)
RETURN SAFE_TO_JSON(query_path) AS path_json
```

```sql
👍 Good example returning a path as JSON in a multiple-hop query.

GRAPH FinGraph
MATCH query_path = (src:Account {id: 9})-[edge]->{1,3}(dst:Account)
RETURN SAFE_TO_JSON(query_path) as path_json
```

```sql
👍 Good example returning multiple paths as JSON.

GRAPH FinGraph
MATCH path_1 = (person:Person {id: 5})-[:Owns]->(accnt:Account),
      path_2 = (src:Account {id: 9})-[:Transfers]->(dst:Account)
RETURN SAFE_TO_JSON(path_1) as path_1,
       SAFE_TO_JSON(path_2) as path_2
```

```
👎 Anti-example returning node properties rather than graph elements in JSON.
   Scalar intergers or strings cannot be visualized.

GRAPH FinGraph
MATCH (person:Person {id: 5})-[owns:Owns]->(accnt:Account)
RETURN person.id AS person,
       owns.amount AS owns,
       accnt.id AS accnt;
```

```sql
👎 Anti-example returning each node and edges in JSON individually.
   This will work but is more verbose than returning paths.

GRAPH FinGraph
MATCH (person:Person {id: 5})-[owns:Owns]->(accnt:Account)
RETURN SAFE_TO_JSON(person) AS person_json,
       SAFE_TO_JSON(owns) AS owns_json,
       SAFE_TO_JSON(accnt) AS accnt_json,
```

## Testing changes

First, install the test dependencies:
```shell
pip install -r requirements-test.txt
```

Then run unit and integration tests with the command below:
```shell
cd spanner_graphs && python -m unittest discover -s tests -p "*_test.py"
```

For frontend testing:
```shell
cd frontend
npm install
npm run test:unit
npm run test:visual
```




# Project setup

```Clone the Project Repository``
Run the following command to clone the repository:

# git clone <repository-url>

```Then navigate into the project directory```

# cd spanner-graph-notebook

```Create and Activate a Virtual Environment```

# python -m venv venv

```Activate the virtual environment```

# source venv/bin/activate


```Install Backend Python Packages```
From the root project directory (spanner-graph-notebook), install the required Python packages:

# pip install -e .

```Install Frontend Dependencies```

```avigate to the frontend directory```

cd frontend

```Install the Node.js dependencies```

npm install

```Start the Backend Server```
Go to the backend development utility directory:

cd ../spanner_graphs/dev_util

```Start the development server```

# python serve_dev.py


